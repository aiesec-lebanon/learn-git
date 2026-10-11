import { describe, expect, it } from "vitest";
import { hashObject } from "../objects/hash";
import type { ObjectPool } from "../types";
import { combinedDiff } from "./combined";

const side = (content: string) => ({
  oid: hashObject({ type: "blob", content }),
  content,
});
const body = (last: string) =>
  `Header\n1\n2\n3\n4\n5\n6\nshared\n${last}\nlast\n`;

describe("combined diff", () => {
  it("coalesces lines both parents lost and names the hunk (Git 2.45.1)", () => {
    const ours = side(body("M8"));
    const theirs = side(body("T8"));
    const pool: ObjectPool = new Map([
      [ours.oid, { type: "blob", content: ours.content }],
      [theirs.oid, { type: "blob", content: theirs.content }],
    ]);
    const result = {
      oid: null,
      content: "Header\n1\n2\n3\n4\n5\n6\nX\nlast\n",
    };
    expect(combinedDiff(pool, "f", [ours, theirs], result)).toBe(
      `diff --cc f
index ${ours.oid.slice(0, 7)},${theirs.oid.slice(0, 7)}..0000000
--- a/f
+++ b/f
@@@ -5,6 -5,6 +5,5 @@@ Heade
  4
  5
  6
--shared
- M8
 -T8
++X
  last
`,
    );
  });

  it("is empty when the result takes one parent's side", () => {
    const ours = side("a\n");
    const pool: ObjectPool = new Map([
      [ours.oid, { type: "blob", content: "a\n" }],
    ]);
    expect(combinedDiff(pool, "f", [ours, side("b\n")], side("b\n"))).toBe("");
  });
});
