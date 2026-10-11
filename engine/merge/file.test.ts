import { describe, expect, it } from "vitest";
import {
  conflictCount,
  mergeFile,
  renderMerge,
  type ConflictStyle,
} from "./file";

/** Recorded with Git 2.45.1: `git merge` with each merge.conflictStyle. */
const CASES = [
  {
    name: "far apart",
    base: "1\n2\n3\n4\n5\n6\n7\n8\n",
    ours: "1\nA\n3\n4\n5\n6\n7\n8\n",
    theirs: "1\n2\n3\n4\n5\n6\nB\n8\n",
    label: "51d7954",
    merge: "1\nA\n3\n4\n5\n6\nB\n8\n",
    diff3: "1\nA\n3\n4\n5\n6\nB\n8\n",
    zdiff3: "1\nA\n3\n4\n5\n6\nB\n8\n",
  },
  {
    name: "adjacent lines",
    base: "1\n2\n3\n4\n5\n",
    ours: "1\nA\n3\n4\n5\n",
    theirs: "1\n2\nB\n4\n5\n",
    label: "6dfbe23",
    merge: "1\n<<<<<<< HEAD\nA\n3\n=======\n2\nB\n>>>>>>> theirs\n4\n5\n",
    diff3:
      "1\n<<<<<<< HEAD\nA\n3\n||||||| 6dfbe23\n2\n3\n=======\n2\nB\n>>>>>>> theirs\n4\n5\n",
    zdiff3:
      "1\n<<<<<<< HEAD\nA\n3\n||||||| 6dfbe23\n2\n3\n=======\n2\nB\n>>>>>>> theirs\n4\n5\n",
  },
  {
    name: "same line",
    base: "1\n2\n3\n",
    ours: "1\nA\n3\n",
    theirs: "1\nB\n3\n",
    label: "c3d3b13",
    merge: "1\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> theirs\n3\n",
    diff3:
      "1\n<<<<<<< HEAD\nA\n||||||| c3d3b13\n2\n=======\nB\n>>>>>>> theirs\n3\n",
    zdiff3:
      "1\n<<<<<<< HEAD\nA\n||||||| c3d3b13\n2\n=======\nB\n>>>>>>> theirs\n3\n",
  },
  {
    name: "identical change",
    base: "1\n2\n3\n4\n",
    ours: "1\nX\n3\n4\n",
    theirs: "1\nX\n3\n4\n",
    label: "5d21ed7",
    merge: "1\nX\n3\n4\n",
    diff3: "1\nX\n3\n4\n",
    zdiff3: "1\nX\n3\n4\n",
  },
  {
    name: "overlapping",
    base: "1\n2\n3\n4\n5\n6\n",
    ours: "1\nA\nA\n4\n5\n6\n",
    theirs: "1\n2\nB\nB\n5\n6\n",
    label: "12a222b",
    merge: "1\n<<<<<<< HEAD\nA\nA\n4\n=======\n2\nB\nB\n>>>>>>> theirs\n5\n6\n",
    diff3:
      "1\n<<<<<<< HEAD\nA\nA\n4\n||||||| 12a222b\n2\n3\n4\n=======\n2\nB\nB\n>>>>>>> theirs\n5\n6\n",
    zdiff3:
      "1\n<<<<<<< HEAD\nA\nA\n4\n||||||| 12a222b\n2\n3\n4\n=======\n2\nB\nB\n>>>>>>> theirs\n5\n6\n",
  },
  {
    name: "two conflicts close",
    base: "1\n2\n3\n4\n5\n6\n7\n",
    ours: "1\nA\n3\n4\nA\n6\n7\n",
    theirs: "1\nB\n3\n4\nB\n6\n7\n",
    label: "3b16704",
    merge:
      "1\n<<<<<<< HEAD\nA\n3\n4\nA\n=======\nB\n3\n4\nB\n>>>>>>> theirs\n6\n7\n",
    diff3:
      "1\n<<<<<<< HEAD\nA\n||||||| 3b16704\n2\n=======\nB\n>>>>>>> theirs\n3\n4\n<<<<<<< HEAD\nA\n||||||| 3b16704\n5\n=======\nB\n>>>>>>> theirs\n6\n7\n",
    zdiff3:
      "1\n<<<<<<< HEAD\nA\n||||||| 3b16704\n2\n=======\nB\n>>>>>>> theirs\n3\n4\n<<<<<<< HEAD\nA\n||||||| 3b16704\n5\n=======\nB\n>>>>>>> theirs\n6\n7\n",
  },
  {
    name: "two conflicts far",
    base: "1\n2\n3\n4\n5\n6\n7\n8\n9\n",
    ours: "1\nA\n3\n4\n5\n6\n7\nA\n9\n",
    theirs: "1\nB\n3\n4\n5\n6\n7\nB\n9\n",
    label: "40fadba",
    merge:
      "1\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> theirs\n3\n4\n5\n6\n7\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> theirs\n9\n",
    diff3:
      "1\n<<<<<<< HEAD\nA\n||||||| 40fadba\n2\n=======\nB\n>>>>>>> theirs\n3\n4\n5\n6\n7\n<<<<<<< HEAD\nA\n||||||| 40fadba\n8\n=======\nB\n>>>>>>> theirs\n9\n",
    zdiff3:
      "1\n<<<<<<< HEAD\nA\n||||||| 40fadba\n2\n=======\nB\n>>>>>>> theirs\n3\n4\n5\n6\n7\n<<<<<<< HEAD\nA\n||||||| 40fadba\n8\n=======\nB\n>>>>>>> theirs\n9\n",
  },
  {
    name: "shared edges",
    base: "1\n2\n3\n4\n5\n",
    ours: "1\nX\nY\nZ\n5\n",
    theirs: "1\nX\nQ\nZ\n5\n",
    label: "6dfbe23",
    merge: "1\nX\n<<<<<<< HEAD\nY\n=======\nQ\n>>>>>>> theirs\nZ\n5\n",
    diff3:
      "1\n<<<<<<< HEAD\nX\nY\nZ\n||||||| 6dfbe23\n2\n3\n4\n=======\nX\nQ\nZ\n>>>>>>> theirs\n5\n",
    zdiff3:
      "1\nX\n<<<<<<< HEAD\nY\n||||||| 6dfbe23\n2\n3\n4\n=======\nQ\n>>>>>>> theirs\nZ\n5\n",
  },
  {
    name: "insert same point",
    base: "1\n2\n",
    ours: "1\nA\n2\n",
    theirs: "1\nB\n2\n",
    label: "85dd9fb",
    merge: "1\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> theirs\n2\n",
    diff3:
      "1\n<<<<<<< HEAD\nA\n||||||| 85dd9fb\n=======\nB\n>>>>>>> theirs\n2\n",
    zdiff3:
      "1\n<<<<<<< HEAD\nA\n||||||| 85dd9fb\n=======\nB\n>>>>>>> theirs\n2\n",
  },
  {
    name: "delete next to change",
    base: "1\n2\n3\n4\n",
    ours: "1\n3\n4\n",
    theirs: "1\n2\nC\n4\n",
    label: "18ae741",
    merge: "1\n<<<<<<< HEAD\n3\n=======\n2\nC\n>>>>>>> theirs\n4\n",
    diff3:
      "1\n<<<<<<< HEAD\n3\n||||||| 18ae741\n2\n3\n=======\n2\nC\n>>>>>>> theirs\n4\n",
    zdiff3:
      "1\n<<<<<<< HEAD\n3\n||||||| 18ae741\n2\n3\n=======\n2\nC\n>>>>>>> theirs\n4\n",
  },
  {
    name: "no final newline",
    base: "1\n2\n3",
    ours: "1\n2\nA",
    theirs: "1\n2\nB",
    label: "a1332b9",
    merge: "1\n2\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> theirs\n",
    diff3:
      "1\n2\n<<<<<<< HEAD\nA\n||||||| a1332b9\n3\n=======\nB\n>>>>>>> theirs\n",
    zdiff3:
      "1\n2\n<<<<<<< HEAD\nA\n||||||| a1332b9\n3\n=======\nB\n>>>>>>> theirs\n",
  },
  {
    name: "both append",
    base: "1\n2\n",
    ours: "1\n2\nA\n",
    theirs: "1\n2\nB\n",
    label: "85dd9fb",
    merge: "1\n2\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> theirs\n",
    diff3:
      "1\n2\n<<<<<<< HEAD\nA\n||||||| 85dd9fb\n=======\nB\n>>>>>>> theirs\n",
    zdiff3:
      "1\n2\n<<<<<<< HEAD\nA\n||||||| 85dd9fb\n=======\nB\n>>>>>>> theirs\n",
  },
  {
    name: "one deletes all",
    base: "1\n2\n3\n",
    ours: "",
    theirs: "1\nB\n3\n",
    label: "c3d3b13",
    merge: "<<<<<<< HEAD\n=======\n1\nB\n3\n>>>>>>> theirs\n",
    diff3:
      "<<<<<<< HEAD\n||||||| c3d3b13\n1\n2\n3\n=======\n1\nB\n3\n>>>>>>> theirs\n",
    zdiff3:
      "<<<<<<< HEAD\n||||||| c3d3b13\n1\n2\n3\n=======\n1\nB\n3\n>>>>>>> theirs\n",
  },
  {
    name: "clean both sides plus identical",
    base: "1\n2\n3\n4\n5\n6\n7\n8\n9\n",
    ours: "A\n2\n3\n4\nX\n6\n7\n8\n9\n",
    theirs: "1\n2\n3\n4\nX\n6\n7\n8\nB\n",
    label: "e4fdf10",
    merge: "A\n2\n3\n4\nX\n6\n7\n8\nB\n",
    diff3: "A\n2\n3\n4\nX\n6\n7\n8\nB\n",
    zdiff3: "A\n2\n3\n4\nX\n6\n7\n8\nB\n",
  },
];

const STYLES: ConflictStyle[] = ["merge", "diff3", "zdiff3"];

describe("three-way file merge", () => {
  for (const c of CASES) {
    for (const style of STYLES) {
      it(`${c.name} (${style})`, () => {
        const merged = mergeFile(c.base, c.ours, c.theirs, style);
        if (merged.kind !== "text") throw new Error(merged.kind);
        const labels = { ours: "HEAD", theirs: "theirs", base: c.label };
        expect(renderMerge(merged.chunks, style, labels)).toBe(c[style]);
      });
    }
  }

  it("counts conflicts and reports binary content", () => {
    const merged = mergeFile("1\n2\n", "1\nA\n", "1\nB\n");
    expect(merged.kind === "text" && conflictCount(merged.chunks)).toBe(1);
    expect(mergeFile("a\0", "b\0", "c\0").kind).toBe("binary");
  });
});
