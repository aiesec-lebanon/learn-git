import { quotePath } from "../files/quote";
import { abbreviate } from "../objects/abbrev";
import { matchesPathspec, type Pathspec } from "../pathspec";
import type { Commit, ObjectPool, Oid } from "../types";
import { compareBytes } from "../util/compare";
import { commitSnapshot, treeSnapshot } from "./forms";
import type { DiffFile } from "./unified";
import { diffContents } from "./numstat";
import { splitLines } from "./myers";

/** One version of a file in a combined diff; null oid = the working tree. */
export type CombinedSide = {
  readonly oid: Oid | null;
  readonly content: string;
};

type Lost = { text: string; map: number };
type Line = {
  text: string;
  flag: number;
  lost: Lost[];
  painted: boolean;
  noPreDelete: boolean;
};

const CONTEXT = 3;
const strip = (line: string) =>
  line.endsWith("\n") ? line.slice(0, -1) : line;

/** A list element the caller knows exists. */
const item = <T>(list: readonly T[], i: number): T => list[i] as T;

/** Git's `coalesce_lines`: merges parent `bit`'s removed lines into a bucket by LCS. */
function coalesce(base: Lost[], fresh: readonly string[], bit: number): Lost[] {
  const n = base.length;
  const m = fresh.length;
  const w = m + 1;
  const lcs = new Array<number>((n + 1) * w).fill(0);
  const dir = new Array<string>((n + 1) * w).fill("B");
  for (let j = 1; j <= m; j++) dir[j] = "N";
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const left = item(lcs, i * w + j - 1);
      const up = item(lcs, (i - 1) * w + j);
      if (item(base, i - 1).text === fresh[j - 1]) {
        lcs[i * w + j] = item(lcs, (i - 1) * w + j - 1) + 1;
        dir[i * w + j] = "M";
      } else if (left >= up) {
        lcs[i * w + j] = left;
        dir[i * w + j] = "N";
      } else {
        lcs[i * w + j] = up;
        dir[i * w + j] = "B";
      }
    }
  }
  const out = base.map((l) => ({ ...l }));
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const d = dir[i * w + j];
    if (d === "M") {
      item(out, i - 1).map |= bit;
      i--;
      j--;
    } else if (d === "N") {
      out.splice(i, 0, { text: item(fresh, j - 1), map: bit });
      j--;
    } else i--;
  }
  return out;
}

/** Marks lines near interesting ones as context (`give_context`). */
function giveContext(lines: Line[], cnt: number, allMask: number) {
  const marked = (i: number) => item(lines, i).painted;
  const next = (from: number, uninteresting: boolean) => {
    for (let i = from; i <= cnt; i++) if (marked(i) !== uninteresting) return i;
    return cnt + 1;
  };
  const tail = (begin: number, i: number) =>
    begin + 1 <= i && !(item(lines, i - 1).flag & allMask) ? i - 1 : i;
  let i = next(0, false);
  while (i <= cnt) {
    for (let j = Math.max(0, i - CONTEXT); j < i; j++) {
      if (!marked(j)) item(lines, j).noPreDelete = true;
      item(lines, j).painted = true;
    }
    for (;;) {
      let j = next(i, true);
      if (cnt < j) return;
      const k = next(j, false);
      j = tail(i, j);
      if (k < j + CONTEXT) {
        while (j < k) item(lines, j++).painted = true;
        i = k;
        continue;
      }
      i = k;
      const end = Math.min(j + CONTEXT, cnt + 1);
      while (j < end) item(lines, j++).painted = true;
      break;
    }
  }
}

/** Drops hunks whose changes all come from one parent (`--cc`, `make_hunks`). */
function densify(lines: Line[], cnt: number, allMask: number) {
  let i = 0;
  while (i <= cnt) {
    while (i <= cnt && !item(lines, i).painted) i++;
    if (cnt < i) break;
    const begin = i;
    let j = i + 1;
    for (; j <= cnt; j++) {
      if (item(lines, j).painted) continue;
      let la =
        begin + 1 <= j && !(item(lines, j - 1).flag & allMask) ? j - 1 : j;
      la = Math.min(la + CONTEXT, cnt + 1);
      let contin = false;
      while (la && j <= --la) {
        if (item(lines, la).painted) {
          contin = true;
          break;
        }
      }
      if (!contin) break;
      j = la;
    }
    const end = j;
    let same = 0;
    let interesting = false;
    for (let k = begin; k < end && !interesting; k++) {
      const sets = [
        item(lines, k).flag & allMask,
        ...item(lines, k).lost.map((l) => l.map),
      ];
      for (const set of sets) {
        if (!set) continue;
        if (!same) same = set;
        else if (same !== set) interesting = true;
      }
    }
    if (!interesting && same !== allMask) {
      for (let k = begin; k < end; k++) item(lines, k).painted = false;
    }
    i = end;
  }
}

/** The hunk comment: the last skipped line starting with a letter, `_` or `$`. */
function comment(text: string | null): string {
  if (!text) return "";
  const head = text.slice(0, 40).split("\n")[0] ?? "";
  let end = 0;
  for (let i = 0; i < head.length; i++)
    if (!/\s/.test(item([...head], i))) end = i;
  return end ? ` ${head.slice(0, end)}` : "";
}

/**
 * A dense combined diff (`diff --cc`) of `result` against each parent,
 * or "" when every change comes from a single parent.
 */
export function combinedDiff(
  pool: ObjectPool,
  path: string,
  parents: readonly CombinedSide[],
  result: CombinedSide,
): string {
  const resultLines = splitLines(result.content);
  const cnt = resultLines.length;
  const lines: Line[] = Array.from({ length: cnt + 1 }, (_, i) => ({
    text: strip(resultLines[i] ?? ""),
    flag: 0,
    lost: [],
    painted: false,
    noPreDelete: false,
  }));
  parents.forEach((parent, n) => {
    const bit = 1 << n;
    const diff = diffContents(parent.content, result.content);
    if (diff.kind !== "text") return;
    const { a, keptA, keptB } = diff;
    const buckets = new Map<number, string[]>();
    let i = 0;
    let j = 0;
    while (i < a.length || j < cnt) {
      if (i < a.length && j < cnt && keptA[i] && keptB[j]) {
        i++;
        j++;
        continue;
      }
      const bucket = j;
      const removed: string[] = [];
      while (i < a.length && !keptA[i]) removed.push(strip(item(a, i++)));
      while (j < cnt && !keptB[j]) item(lines, j++).flag |= bit;
      if (removed.length) buckets.set(bucket, removed);
    }
    for (const [at, removed] of buckets) {
      const line = item(lines, at);
      line.lost = coalesce(line.lost, removed, bit);
    }
  });
  const allMask = (1 << parents.length) - 1;
  for (const line of lines)
    line.painted = !!(line.flag & allMask) || line.lost.length > 0;
  densify(lines, cnt, allMask);
  if (!lines.some((l) => l.painted)) return "";
  giveContext(lines, cnt, allMask);
  const lno = (n: number, at: number) => {
    let p = 1;
    for (let k = 0; k < at; k++) {
      p += item(lines, k).lost.filter((l) => l.map & (1 << n)).length;
      if (k < cnt && !(item(lines, k).flag & (1 << n))) p++;
    }
    return p;
  };
  const abbrev = (side: CombinedSide) =>
    side.oid ? abbreviate(pool, side.oid) : "0000000";
  const name = quotePath(path);
  let out = `diff --cc ${name}\nindex ${parents.map(abbrev).join(",")}..${abbrev(result)}\n--- a/${name}\n+++ b/${name}\n`;
  const marker = "@".repeat(parents.length + 1);
  let at = 0;
  for (;;) {
    let skipped: string | null = null;
    while (at <= cnt && !item(lines, at).painted) {
      if (at < cnt && /^[A-Za-z_$]/.test(item(lines, at).text))
        skipped = item(lines, at).text;
      at++;
    }
    if (cnt < at) break;
    let end = at + 1;
    while (end <= cnt && item(lines, end).painted) end++;
    const rlines = end - at - (cnt < end ? 1 : 0);
    const ranges = parents.map(
      (_, n) => ` -${lno(n, at)},${lno(n, end) - lno(n, at)}`,
    );
    out += `${marker}${ranges.join("")} +${at + 1},${rlines} ${marker}${comment(skipped)}\n`;
    for (; at < end; at++) {
      const line = item(lines, at);
      if (!line.noPreDelete) {
        for (const lost of line.lost) {
          const cols = parents.map((_, n) => (lost.map & (1 << n) ? "-" : " "));
          out += `${cols.join("")}${lost.text}\n`;
        }
      }
      if (at >= cnt) break;
      const cols = parents.map((_, n) => (line.flag & (1 << n) ? "+" : " "));
      out += `${cols.join("")}${line.text}\n`;
    }
    at = end;
  }
  return out;
}

/** `git show` for a merge: a combined diff of each path that differs from every parent. */
export function mergeDiff(
  pool: ObjectPool,
  commit: Commit,
  specs: readonly Pathspec[],
): string {
  const result = treeSnapshot(pool, commit.tree);
  const parents = commit.parents.map((p) => commitSnapshot(pool, p));
  const side = (file: DiffFile | undefined): CombinedSide => ({
    oid: file?.oid ?? null,
    content: file?.content ?? "",
  });
  return [...result.keys()]
    .sort(compareBytes)
    .filter(
      (path) => !specs.length || specs.some((s) => matchesPathspec(s, path)),
    )
    .filter((path) =>
      parents.every((p) => p.get(path)?.oid !== result.get(path)?.oid),
    )
    .map((path) =>
      combinedDiff(
        pool,
        path,
        parents.map((p) => side(p.get(path))),
        side(result.get(path)),
      ),
    )
    .join("");
}
