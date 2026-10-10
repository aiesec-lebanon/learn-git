import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { slideDown } from "./compact";
import { diffLines, splitLines } from "./myers";
import { diffContents, isBinary, numstat } from "./numstat";

function lcsLength(a: readonly string[], b: readonly string[]): number {
  const row = new Array<number>(b.length + 1).fill(0);
  for (const x of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] ?? 0;
      row[j] = x === b[j - 1] ? diagonal + 1 : Math.max(above, row[j - 1] ?? 0);
      diagonal = above;
    }
  }
  return row[b.length] ?? 0;
}

const keptLines = (lines: readonly string[], kept: readonly boolean[]) =>
  lines.filter((_, i) => kept[i]);

describe("Myers line diff", () => {
  it("splits lines with their terminators", () => {
    expect(splitLines("a\nb")).toEqual(["a\n", "b"]);
    expect(splitLines("a\n\n")).toEqual(["a\n", "\n"]);
    expect(splitLines("")).toEqual([]);
  });

  it("keeps a longest common subsequence", () => {
    const lines = fc.array(fc.constantFrom("a\n", "b\n", "c\n", "d"), {
      maxLength: 14,
    });
    fc.assert(
      fc.property(lines, lines, (a, b) => {
        const { keptA, keptB } = diffLines(a, b);
        const left = keptLines(a, keptA);
        expect(left).toEqual(keptLines(b, keptB));
        expect(left.length).toBe(lcsLength(a, b));
      }),
      { numRuns: 500 },
    );
  });

  it("counts a missing final newline as a change", () => {
    expect(numstat("a\nb\n", "a\nb")).toEqual({
      added: 1,
      deleted: 1,
      binary: false,
    });
    expect(numstat(null, "x\ny\n")).toEqual({
      added: 2,
      deleted: 0,
      binary: false,
    });
    expect(numstat("x\n", null)).toEqual({
      added: 0,
      deleted: 1,
      binary: false,
    });
    expect(numstat("same\n", "same\n")).toEqual({
      added: 0,
      deleted: 0,
      binary: false,
    });
  });

  it("detects binary content by a NUL in the first 8,000 characters", () => {
    expect(isBinary("PNG\0data")).toBe(true);
    expect(isBinary(`${"x".repeat(8000)}\0`)).toBe(false);
    expect(numstat("text\n", "bin\0")).toEqual({
      added: 0,
      deleted: 0,
      binary: true,
    });
  });

  it("stops at the line cap", () => {
    const big = "x\n".repeat(2001);
    expect(diffContents(big, "y\n").kind).toBe("too-large");
    expect(numstat(big, "y\n")).toEqual({
      added: 1,
      deleted: 2001,
      binary: false,
    });
  });

  it("rests ambiguous runs at their lowest position", () => {
    const lines = ["a\n", "b\n", "a\n", "b\n", "c\n"];
    const kept = [true, true, false, false, true];
    slideDown(lines, kept);
    expect(kept).toEqual([true, true, false, false, true]);
    const repeated = ["x\n", "x\n", "x\n"];
    const first = [false, true, true];
    slideDown(repeated, first);
    expect(first).toEqual([true, true, false]);
    const diff = diffContents("a\n}\n\nb\n", "a\n}\n\nnew\n}\n\nb\n");
    expect(diff.kind === "text" && diff.keptB).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      true,
    ]);
  });
});
