import { LIMITS } from "../limits";
import { compareBytes } from "../util/compare";
import { isBinary } from "./numstat";
import type { DiffFile, FilePair } from "./unified";

const MAX_SCORE = 60000;
/** Git's default `-M50%`. */
const MIN_SCORE = 30000;
const HASHBASE = 107927;
const encoder = new TextEncoder();

/** Git's diffcore-delta: byte counts per hashed chunk (a line, or 64 bytes). */
function chunks(content: string): Map<number, number> {
  const bytes = encoder.encode(content);
  const text = !isBinary(content);
  const counts = new Map<number, number>();
  const add = (a1: number, a2: number, n: number) => {
    const hash = ((a1 + Math.imul(a2, 0x61)) >>> 0) % HASHBASE;
    counts.set(hash, (counts.get(hash) ?? 0) + n);
  };
  let n = 0;
  let a1 = 0;
  let a2 = 0;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i] ?? 0;
    if (text && c === 13 && bytes[i + 1] === 10) continue;
    const old = a1;
    a1 = (((a1 << 7) ^ (a2 >>> 25)) + c) >>> 0;
    a2 = ((a2 << 7) ^ (old >>> 25)) >>> 0;
    if (++n < 64 && c !== 10) continue;
    add(a1, a2, n);
    n = 0;
    a1 = 0;
    a2 = 0;
  }
  if (n > 0) add(a1, a2, n);
  return counts;
}

const chunkMemo = new Map<string, Map<number, number>>();
const chunksOf = (file: DiffFile) => {
  let found = chunkMemo.get(file.oid);
  if (!found) {
    found = chunks(file.content);
    if (chunkMemo.size > 2000) chunkMemo.clear();
    chunkMemo.set(file.oid, found);
  }
  return found;
};

/** Git's rename score (0 to 60000): how much of the larger file the source supplies. */
export function similarity(src: DiffFile, dst: DiffFile): number {
  const a = encoder.encode(src.content).length;
  const b = encoder.encode(dst.content).length;
  const max = Math.max(a, b);
  const delta = max - Math.min(a, b);
  if (max * (MAX_SCORE - MIN_SCORE) < delta * MAX_SCORE || !b) return 0;
  const from = chunksOf(src);
  let copied = 0;
  for (const [hash, count] of chunksOf(dst))
    copied += Math.min(count, from.get(hash) ?? 0);
  return Math.floor((copied * MAX_SCORE) / max);
}

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/**
 * Folds deletions and additions into renames the way Git does by default:
 * identical blobs first, then the most similar pairs at 50% or more. Inexact
 * matching is skipped above the sandbox's candidate cap. Pairs come back in
 * path order of their new names.
 */
export function detectRenames(pairs: readonly FilePair[]): FilePair[] {
  const sources = pairs.filter((p) => p.before && !p.after);
  const targets = pairs.filter((p) => !p.before && p.after);
  if (!sources.length || !targets.length) return [...pairs];
  const used = new Set<FilePair>();
  const renamed = new Map<FilePair, { src: FilePair; score: number }>();

  for (const dst of targets) {
    const same = sources.filter(
      (s) => !used.has(s) && s.before?.oid === dst.after?.oid,
    );
    const src =
      same.find((s) => baseName(s.path) === baseName(dst.path)) ?? same[0];
    if (!src) continue;
    used.add(src);
    renamed.set(dst, { src, score: MAX_SCORE });
  }

  const left = sources.filter((s) => !used.has(s));
  const open = targets.filter((t) => !renamed.has(t));
  if (left.length * open.length <= LIMITS.renameCandidates ** 2) {
    const matrix: { dst: FilePair; src: FilePair; score: number }[] = [];
    for (const dst of open)
      for (const src of left) {
        if (!src.before || !dst.after) continue;
        const score = similarity(src.before, dst.after);
        if (score >= MIN_SCORE) matrix.push({ dst, src, score });
      }
    matrix.sort(
      (x, y) =>
        y.score - x.score ||
        Number(baseName(y.src.path) === baseName(y.dst.path)) -
          Number(baseName(x.src.path) === baseName(x.dst.path)),
    );
    for (const m of matrix) {
      if (renamed.has(m.dst) || used.has(m.src)) continue;
      used.add(m.src);
      renamed.set(m.dst, { src: m.src, score: m.score });
    }
  }

  const out: FilePair[] = [];
  for (const pair of pairs) {
    if (used.has(pair)) continue;
    const r = renamed.get(pair);
    out.push(
      r
        ? {
            path: pair.path,
            from: r.src.path,
            similarity: Math.floor((r.score * 100) / MAX_SCORE),
            before: r.src.before,
            after: pair.after,
          }
        : pair,
    );
  }
  return out.sort((a, b) => compareBytes(a.path, b.path));
}

/** How Git names a rename in a diffstat: `a.txt => b.txt` or `{docs => archive}/faq.md`. */
export function renameName(from: string, to: string): string {
  let prefix = 0;
  for (let i = 0; i < from.length && i < to.length && from[i] === to[i]; i++)
    if (from[i] === "/") prefix = i + 1;
  let suffix = 0;
  const adjust = prefix ? 1 : 0;
  for (
    let i = from.length, j = to.length;
    i >= prefix - adjust && j >= prefix - adjust && from[i] === to[j];
    i--, j--
  )
    if (from[i] === "/") suffix = from.length - i;
  if (!prefix && !suffix) return `${from} => ${to}`;
  const midA = from.slice(prefix, Math.max(prefix, from.length - suffix));
  const midB = to.slice(prefix, Math.max(prefix, to.length - suffix));
  return `${from.slice(0, prefix)}{${midA} => ${midB}}${from.slice(from.length - suffix)}`;
}
