import { describe, expect, it } from "vitest";
import { hashObject } from "../objects/hash";
import type { FileMode, ObjectPool } from "../types";
import { unifiedDiff, type DiffFile } from "./unified";

const pool: ObjectPool = new Map();
const file = (content: string, mode: FileMode = "100644"): DiffFile => ({
  oid: hashObject({ type: "blob", content }),
  mode,
  content,
});
const diff = (path: string, before: string | null, after: string | null) =>
  unifiedDiff(pool, {
    path,
    before: before === null ? null : file(before),
    after: after === null ? null : file(after),
  });

const lines = (...l: string[]) => l.map((x) => `${x}\n`).join("");

describe("unified diff (output recorded from Git 2.45.1)", () => {
  it("names the enclosing function and splits distant hunks", () => {
    const body = (four: string, six: string) =>
      lines(
        "header",
        "function alpha() {",
        "  one",
        "  two",
        "  three",
        `  ${four}`,
        "  five",
        "  six",
        "  seven",
        "}",
        "",
        "function beta() {",
        "  b1",
        "  b2",
        "  b3",
        "  b4",
        "  b5",
        `  ${six}`,
        "  b7",
        "  b8",
        "}",
      );
    expect(diff("f.js", body("four", "b6"), body("FOUR", "B6"))).toBe(
      `diff --git a/f.js b/f.js
index 8945aa4..a5091bb 100644
--- a/f.js
+++ b/f.js
@@ -3,7 +3,7 @@ function alpha() {
   one
   two
   three
-  four
+  FOUR
   five
   six
   seven
@@ -15,7 +15,7 @@ function beta() {
   b3
   b4
   b5
-  b6
+  B6
   b7
   b8
 }
`,
    );
  });

  it("truncates the function line to 80 characters", () => {
    const head = `${"x".repeat(90)}   `;
    expect(
      diff(
        "long.txt",
        lines(head, "1", "2", "3", "4", "5"),
        lines(head, "1", "2", "3", "4", "FIVE"),
      ),
    ).toBe(`diff --git a/long.txt b/long.txt
index 1e96f4a..4d46571 100644
--- a/long.txt
+++ b/long.txt
@@ -3,4 +3,4 @@ ${"x".repeat(80)}
 2
 3
 4
-5
+FIVE
`);
  });

  it("merges changes six lines apart and splits at seven", () => {
    const numbers = (swap: Record<number, string>) =>
      lines(...Array.from({ length: 20 }, (_, i) => swap[i + 1] ?? `${i + 1}`));
    const out = diff(
      "n.txt",
      numbers({}),
      numbers({ 2: "TWO", 10: "TEN", 19: "NINETEEN" }),
    );
    expect(out.match(/^@@.*$/gm)).toEqual([
      "@@ -1,5 +1,5 @@",
      "@@ -7,7 +7,7 @@",
      "@@ -16,5 +16,5 @@",
    ]);
    const merged = diff("n.txt", numbers({}), numbers({ 2: "TWO", 9: "NINE" }));
    expect(merged.match(/^@@.*$/gm)).toEqual(["@@ -1,12 +1,12 @@"]);
  });

  it("marks a missing final newline", () => {
    expect(diff("nonl.txt", "a\nb\nc", lines("a", "b", "c", "d"))).toBe(
      `diff --git a/nonl.txt b/nonl.txt
index 1c943a9..d68dd40 100644
--- a/nonl.txt
+++ b/nonl.txt
@@ -1,3 +1,4 @@
 a
 b
-c
\\ No newline at end of file
+c
+d
`,
    );
  });

  it("shows new, deleted, empty and binary files", () => {
    expect(diff("new.txt", null, "new\nfile"))
      .toBe(`diff --git a/new.txt b/new.txt
new file mode 100644
index 0000000..9c38d10
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+new
+file
\\ No newline at end of file
`);
    expect(diff("del.txt", lines("gone", "gone2"), null))
      .toBe(`diff --git a/del.txt b/del.txt
deleted file mode 100644
index 2597454..0000000
--- a/del.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-gone
-gone2
`);
    expect(diff("empty.txt", "", null)).toBe(`diff --git a/empty.txt b/empty.txt
deleted file mode 100644
index e69de29..0000000
`);
    expect(diff("newempty", null, "")).toBe(`diff --git a/newempty b/newempty
new file mode 100644
index 0000000..e69de29
`);
    expect(diff("b.bin", "bin\0ary", "bin\0ary2"))
      .toBe(`diff --git a/b.bin b/b.bin
index 87ae6b6..22f6b3b 100644
Binary files a/b.bin and b/b.bin differ
`);
    expect(diff("newbin", null, "x\0")).toBe(`diff --git a/newbin b/newbin
new file mode 100644
index 0000000..7a002a8
Binary files /dev/null and b/newbin differ
`);
  });

  it("quotes unusual paths and reports mode changes", () => {
    const out = unifiedDiff(pool, {
      path: "é.sh",
      before: file("x\n"),
      after: file("x\n", "100755"),
    });
    expect(out).toBe(`diff --git "a/\\303\\251.sh" "b/\\303\\251.sh"
old mode 100644
new mode 100755
`);
  });

  it("answers for diffs over the line cap", () => {
    const big = "x\n".repeat(2001);
    expect(diff("big.txt", big, `${big}y\n`)).toMatch(
      /not simulated here: diffs over 2000 lines\n$/,
    );
  });
});
