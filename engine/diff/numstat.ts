import { LIMITS } from "../limits";
import { slideDown } from "./compact";
import { diffLines, splitLines } from "./myers";

/** Git treats content with a NUL in its first 8,000 bytes as binary. */
export function isBinary(content: string): boolean {
  return content.slice(0, 8000).includes("\0");
}

export type LineDiff =
  | {
      readonly kind: "text";
      readonly a: readonly string[];
      readonly b: readonly string[];
      readonly keptA: readonly boolean[];
      readonly keptB: readonly boolean[];
    }
  | { readonly kind: "binary" }
  | { readonly kind: "too-large" };

/** Line diff of two file versions (null = absent), with Git's run placement. */
export function diffContents(
  before: string | null,
  after: string | null,
): LineDiff {
  const left = before ?? "";
  const right = after ?? "";
  if (isBinary(left) || isBinary(right)) return { kind: "binary" };
  const a = splitLines(left);
  const b = splitLines(right);
  if (a.length > LIMITS.diffLines || b.length > LIMITS.diffLines) {
    return { kind: "too-large" };
  }
  const { keptA, keptB } = diffLines(a, b);
  slideDown(a, keptA);
  slideDown(b, keptB);
  return { kind: "text", a, b, keptA, keptB };
}

export type NumStat = {
  readonly added: number;
  readonly deleted: number;
  readonly binary: boolean;
};

/** Added and deleted line counts, as `git diff --numstat` reports them. */
export function numstat(before: string | null, after: string | null): NumStat {
  const diff = diffContents(before, after);
  if (diff.kind === "binary") return { added: 0, deleted: 0, binary: true };
  if (diff.kind === "too-large") {
    const count = (s: string | null) => splitLines(s ?? "").length;
    return { added: count(after), deleted: count(before), binary: false };
  }
  const changed = (kept: readonly boolean[]) => kept.filter((k) => !k).length;
  return {
    added: changed(diff.keptB),
    deleted: changed(diff.keptA),
    binary: false,
  };
}
