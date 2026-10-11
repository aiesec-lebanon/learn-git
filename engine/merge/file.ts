import { diffContents } from "../diff/numstat";

export type ConflictStyle = "merge" | "diff3" | "zdiff3";

export type MergeLabels = {
  readonly ours: string;
  readonly theirs: string;
  /** Shown on the `|||||||` line in the diff3 and zdiff3 styles. */
  readonly base: string;
};

/** A stretch of the merged file, in order. */
export type MergeChunk =
  | { readonly kind: "same"; readonly lines: readonly string[] }
  | {
      readonly kind: "ours" | "theirs";
      readonly lines: readonly string[];
      readonly base: readonly string[];
    }
  | {
      readonly kind: "conflict";
      readonly ours: readonly string[];
      readonly base: readonly string[];
      readonly theirs: readonly string[];
    };

export type FileMerge =
  | { readonly kind: "text"; readonly chunks: readonly MergeChunk[] }
  | { readonly kind: "binary" | "too-large" };

/** One edit: base lines `[i1, i1 + chg1)` become side lines `[i2, i2 + chg2)`. */
type Change = { i1: number; chg1: number; i2: number; chg2: number };

/** xdiff's merge region: 0 conflict, 1 ours, 2 theirs, 4 identical. */
type Region = {
  mode: 0 | 1 | 2 | 4;
  i0: number;
  chg0: number;
  i1: number;
  chg1: number;
  i2: number;
  chg2: number;
};

type Lines = readonly string[];
type Diff = { a: Lines; b: Lines; changes: Change[] };

function editScript(before: string, after: string): Diff | FileMerge {
  const diff = diffContents(before, after);
  if (diff.kind !== "text") return { kind: diff.kind };
  const { a, b, keptA, keptB } = diff;
  const changes: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && keptA[i] && keptB[j]) {
      i++;
      j++;
      continue;
    }
    const start = { i1: i, i2: j };
    while (i < a.length && !keptA[i]) i++;
    while (j < b.length && !keptB[j]) j++;
    changes.push({ ...start, chg1: i - start.i1, chg2: j - start.i2 });
  }
  return { a, b, changes };
}

const sameLines = (a: Lines, i: number, b: Lines, j: number, n: number) => {
  for (let k = 0; k < n; k++) if (a[i + k] !== b[j + k]) return false;
  return true;
};

function append(
  list: Region[],
  mode: 0 | 1 | 2,
  [i0, chg0, i1, chg1, i2, chg2]: readonly number[],
) {
  const m = list.at(-1);
  if (m && ((i1 ?? 0) <= m.i1 + m.chg1 || (i2 ?? 0) <= m.i2 + m.chg2)) {
    if (mode !== m.mode) m.mode = 0;
    m.chg0 = (i0 ?? 0) + (chg0 ?? 0) - m.i0;
    m.chg1 = (i1 ?? 0) + (chg1 ?? 0) - m.i1;
    m.chg2 = (i2 ?? 0) + (chg2 ?? 0) - m.i2;
    return;
  }
  list.push({
    mode,
    i0: i0 ?? 0,
    chg0: chg0 ?? 0,
    i1: i1 ?? 0,
    chg1: chg1 ?? 0,
    i2: i2 ?? 0,
    chg2: chg2 ?? 0,
  });
}

/** Pairs the two edit scripts into regions (xdiff's `xdl_do_merge`). */
function regionsOf(base: Lines, one: Diff, two: Diff): Region[] {
  const list: Region[] = [];
  const x1 = one.changes;
  const x2 = two.changes;
  let a = 0;
  let b = 0;
  while (a < x1.length && b < x2.length) {
    const c1 = x1[a] as Change;
    const c2 = x2[b] as Change;
    if (c1.i1 + c1.chg1 < c2.i1) {
      const i2 = c2.i2 - c2.i1 + c1.i1;
      append(list, 1, [c1.i1, c1.chg1, c1.i2, c1.chg2, i2, c1.chg1]);
      a++;
      continue;
    }
    if (c2.i1 + c2.chg1 < c1.i1) {
      const i1 = c1.i2 - c1.i1 + c2.i1;
      append(list, 2, [c2.i1, c2.chg1, i1, c2.chg1, c2.i2, c2.chg2]);
      b++;
      continue;
    }
    if (
      c1.i1 !== c2.i1 ||
      c1.chg1 !== c2.chg1 ||
      c1.chg2 !== c2.chg2 ||
      !sameLines(one.b, c1.i2, two.b, c2.i2, c1.chg2)
    ) {
      const off = c1.i1 - c2.i1;
      const ffo = off + c1.chg1 - c2.chg1;
      let i0 = c1.i1;
      let i1 = c1.i2;
      let i2 = c2.i2;
      if (off > 0) {
        i0 -= off;
        i1 -= off;
      } else i2 += off;
      let chg0 = c1.i1 + c1.chg1 - i0;
      let chg1 = c1.i2 + c1.chg2 - i1;
      let chg2 = c2.i2 + c2.chg2 - i2;
      if (ffo < 0) {
        chg0 -= ffo;
        chg1 -= ffo;
      } else chg2 += ffo;
      append(list, 0, [i0, chg0, i1, chg1, i2, chg2]);
    }
    const end1 = c1.i1 + c1.chg1;
    const end2 = c2.i1 + c2.chg1;
    if (end1 >= end2) b++;
    if (end2 >= end1) a++;
  }
  for (; a < x1.length; a++) {
    const c = x1[a] as Change;
    const i2 = c.i1 + two.b.length - base.length;
    append(list, 1, [c.i1, c.chg1, c.i2, c.chg2, i2, c.chg1]);
  }
  for (; b < x2.length; b++) {
    const c = x2[b] as Change;
    const i1 = c.i1 + one.b.length - base.length;
    append(list, 2, [c.i1, c.chg1, i1, c.chg1, c.i2, c.chg2]);
  }
  return list;
}

/** Splits each conflict where both sides agree (xdiff's ZEALOUS refinement). */
function refine(regions: Region[], ours: Lines, theirs: Lines): Region[] {
  const out: Region[] = [];
  for (const m of regions) {
    if (m.mode !== 0 || m.chg1 === 0 || m.chg2 === 0) {
      out.push(m);
      continue;
    }
    const inner = editScript(
      ours.slice(m.i1, m.i1 + m.chg1).join(""),
      theirs.slice(m.i2, m.i2 + m.chg2).join(""),
    );
    if (!("changes" in inner) || inner.changes.length === 0) {
      out.push({ ...m, mode: 4 });
      continue;
    }
    inner.changes.forEach((c, n) =>
      out.push({
        mode: 0,
        i0: n === 0 ? m.i0 : 0,
        chg0: n === 0 ? m.chg0 : 0,
        i1: m.i1 + c.i1,
        chg1: c.chg1,
        i2: m.i2 + c.i2,
        chg2: c.chg2,
      }),
    );
  }
  return out;
}

/** Joins conflicts at most three lines apart (`xdl_simplify_non_conflicts`). */
function simplify(regions: Region[]): Region[] {
  const out: Region[] = [];
  for (const next of regions) {
    const m = out.at(-1);
    if (
      m &&
      m.mode === 0 &&
      next.mode === 0 &&
      next.i1 - (m.i1 + m.chg1) <= 3
    ) {
      m.chg0 = next.i0 + next.chg0 - m.i0;
      m.chg1 = next.i1 + next.chg1 - m.i1;
      m.chg2 = next.i2 + next.chg2 - m.i2;
    } else out.push({ ...next });
  }
  return out;
}

/** zdiff3: moves lines both sides share at a conflict's edges out of it. */
function trim(regions: Region[], ours: Lines, theirs: Lines): Region[] {
  return regions.map((r) => {
    const m = { ...r };
    if (m.mode !== 0) return m;
    while (m.chg1 && m.chg2 && ours[m.i1] === theirs[m.i2]) {
      m.chg1--;
      m.chg2--;
      m.i1++;
      m.i2++;
    }
    while (
      m.chg1 &&
      m.chg2 &&
      ours[m.i1 + m.chg1 - 1] === theirs[m.i2 + m.chg2 - 1]
    ) {
      m.chg1--;
      m.chg2--;
    }
    return m;
  });
}

/**
 * Git's three-way line merge (xdiff, ZEALOUS level): changes on one side
 * apply; identical changes merge; overlapping or touching changes conflict.
 */
export function mergeFile(
  base: string,
  ours: string,
  theirs: string,
  style: ConflictStyle = "merge",
): FileMerge {
  const one = editScript(base, ours);
  if (!("changes" in one)) return one;
  const two = editScript(base, theirs);
  if (!("changes" in two)) return two;
  const o = one.b;
  const t = two.b;
  const b = one.a;
  if (!one.changes.length) return { kind: "text", chunks: [same(t)] };
  if (!two.changes.length) return { kind: "text", chunks: [same(o)] };
  let regions = regionsOf(b, one, two);
  if (style === "zdiff3") regions = trim(regions, o, t);
  else if (style === "merge") regions = simplify(refine(regions, o, t));
  const chunks: MergeChunk[] = [];
  let i = 0;
  const keep = (to: number) => {
    if (to > i) chunks.push(same(o.slice(i, to)));
  };
  for (const m of regions) {
    if (m.mode === 4) continue;
    keep(m.i1);
    const baseLines = b.slice(m.i0, m.i0 + m.chg0);
    const ourLines = o.slice(m.i1, m.i1 + m.chg1);
    const theirLines = t.slice(m.i2, m.i2 + m.chg2);
    if (m.mode === 0) {
      chunks.push({
        kind: "conflict",
        ours: ourLines,
        base: baseLines,
        theirs: theirLines,
      });
    } else if (m.mode === 1) {
      chunks.push({ kind: "ours", lines: ourLines, base: baseLines });
    } else {
      chunks.push({ kind: "theirs", lines: theirLines, base: baseLines });
    }
    i = m.i1 + m.chg1;
  }
  keep(o.length);
  return { kind: "text", chunks };
}

const same = (lines: Lines): MergeChunk => ({ kind: "same", lines });

const MARKER = 7;
/** Lines of one side; a last line without a newline gets one before a marker. */
const block = (lines: Lines) => {
  const text = lines.join("");
  return text === "" || text.endsWith("\n") ? text : `${text}\n`;
};

/** The merged text with conflict markers in the given style. */
export function renderMerge(
  chunks: readonly MergeChunk[],
  style: ConflictStyle,
  labels: MergeLabels,
): string {
  return chunks
    .map((chunk) => {
      if (chunk.kind !== "conflict") return chunk.lines.join("");
      const baseBlock =
        style === "merge"
          ? ""
          : `${"|".repeat(MARKER)} ${labels.base}\n${block(chunk.base)}`;
      return `${"<".repeat(MARKER)} ${labels.ours}\n${block(chunk.ours)}${baseBlock}${"=".repeat(MARKER)}\n${block(chunk.theirs)}${">".repeat(MARKER)} ${labels.theirs}\n`;
    })
    .join("");
}

export const conflictCount = (chunks: readonly MergeChunk[]) =>
  chunks.filter((c) => c.kind === "conflict").length;
