import { quotePath } from "../files/quote";
import { abbreviate, MIN_ABBREV } from "../objects/abbrev";
import type { FileMode, ObjectPool, Oid } from "../types";
import { notSimulated } from "../messages/git";
import { LIMITS } from "../limits";
import { diffContents } from "./numstat";

export type DiffFile = {
  readonly oid: Oid;
  readonly mode: FileMode;
  readonly content: string;
};

export type FilePair = {
  readonly path: string;
  readonly before: DiffFile | null;
  readonly after: DiffFile | null;
  /** The old path when Git pairs a deletion with an addition as a rename. */
  readonly from?: string;
  /** The rename's similarity, in percent. */
  readonly similarity?: number;
};

export type HunkLine = {
  readonly sign: " " | "-" | "+";
  readonly text: string;
};

export type Hunk = {
  readonly header: string;
  readonly lines: readonly HunkLine[];
};

const CONTEXT = 3;
const FUNC_CHARS = 80;

type Change = { a: number; aLen: number; b: number; bLen: number };

function changes(keptA: readonly boolean[], keptB: readonly boolean[]) {
  const out: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < keptA.length || j < keptB.length) {
    if (keptA[i] && keptB[j]) {
      i++;
      j++;
      continue;
    }
    const change = { a: i, aLen: 0, b: j, bLen: 0 };
    while (i < keptA.length && !keptA[i]) i++;
    while (j < keptB.length && !keptB[j]) j++;
    change.aLen = i - change.a;
    change.bLen = j - change.b;
    out.push(change);
  }
  return out;
}

/** Git's default funcname rule: the nearest earlier line starting with a letter, `_` or `$`. */
function functionLine(lines: readonly string[], before: number): string {
  for (let i = before - 1; i >= 0; i--) {
    const line = lines[i] ?? "";
    if (/^[A-Za-z_$]/.test(line)) {
      return line.slice(0, FUNC_CHARS).replace(/\s+$/, "");
    }
  }
  return "";
}

const range = (start: number, length: number) =>
  length === 0
    ? `${start},0`
    : length === 1
      ? `${start + 1}`
      : `${start + 1},${length}`;

/** Hunks with three lines of context; changes up to six lines apart share a hunk. */
export function diffHunks(
  a: readonly string[],
  b: readonly string[],
  keptA: readonly boolean[],
  keptB: readonly boolean[],
): Hunk[] {
  const groups: Change[][] = [];
  for (const change of changes(keptA, keptB)) {
    const last = groups.at(-1)?.at(-1);
    if (last && change.a - (last.a + last.aLen) <= 2 * CONTEXT) {
      groups.at(-1)?.push(change);
    } else groups.push([change]);
  }
  return groups.map((group) => {
    const first = group[0] as Change;
    const last = group.at(-1) as Change;
    const lead = Math.min(CONTEXT, first.a);
    const trail = Math.min(CONTEXT, a.length - (last.a + last.aLen));
    const aStart = first.a - lead;
    const bStart = first.b - lead;
    const lines: HunkLine[] = [];
    const context = (from: number, to: number) => {
      for (let i = from; i < to; i++)
        lines.push({ sign: " ", text: a[i] ?? "" });
    };
    context(aStart, first.a);
    group.forEach((change, n) => {
      for (let i = 0; i < change.aLen; i++)
        lines.push({ sign: "-", text: a[change.a + i] ?? "" });
      for (let i = 0; i < change.bLen; i++)
        lines.push({ sign: "+", text: b[change.b + i] ?? "" });
      const next = group[n + 1];
      context(
        change.a + change.aLen,
        next ? next.a : change.a + change.aLen + trail,
      );
    });
    const aLen = last.a + last.aLen + trail - aStart;
    const bLen = last.b + last.bLen + trail - bStart;
    const func = functionLine(a, aStart);
    return {
      header: `@@ -${range(aStart, aLen)} +${range(bStart, bLen)} @@${func ? ` ${func}` : ""}`,
      lines,
    };
  });
}

const NO_NEWLINE = "\\ No newline at end of file\n";

const lineText = ({ sign, text }: HunkLine) =>
  text.endsWith("\n") ? `${sign}${text}` : `${sign}${text}\n${NO_NEWLINE}`;

const ZERO = "0".repeat(MIN_ABBREV);

/** One file's section of `git diff` output, as Git prints it. */
export function unifiedDiff(pool: ObjectPool, pair: FilePair): string {
  const { path, before, after } = pair;
  const old = pair.from;
  const a = quotePath(`a/${old ?? path}`);
  const b = quotePath(`b/${path}`);
  const id = (file: DiffFile | null) =>
    file ? abbreviate(pool, file.oid) : ZERO;
  let out = `diff --git ${a} ${b}\n`;
  if (!before && after) out += `new file mode ${after.mode}\n`;
  if (before && !after) out += `deleted file mode ${before.mode}\n`;
  const sameMode = before && after && before.mode === after.mode;
  if (before && after && !sameMode) {
    out += `old mode ${before.mode}\nnew mode ${after.mode}\n`;
  }
  if (old !== undefined) {
    out += `similarity index ${pair.similarity}%
rename from ${quotePath(old)}
rename to ${quotePath(path)}
`;
  }
  if (before?.oid === after?.oid) return out;
  out += `index ${id(before)}..${id(after)}${sameMode ? ` ${before.mode}` : ""}\n`;
  const diff = diffContents(before?.content ?? null, after?.content ?? null);
  const from = before ? a : "/dev/null";
  const to = after ? b : "/dev/null";
  if (diff.kind === "binary")
    return `${out}Binary files ${from} and ${to} differ\n`;
  if (diff.kind === "too-large") {
    return out + notSimulated(`diffs over ${LIMITS.diffLines} lines`);
  }
  const hunks = diffHunks(diff.a, diff.b, diff.keptA, diff.keptB);
  if (hunks.length === 0) return out;
  out += `--- ${from}\n+++ ${to}\n`;
  for (const hunk of hunks) {
    out += `${hunk.header}\n${hunk.lines.map(lineText).join("")}`;
  }
  return out;
}
