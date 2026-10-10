import { describe, expect, it } from "vitest";
import { hashObject } from "../objects/hash";
import { detectRenames, renameName, similarity } from "./renames";
import type { DiffFile, FilePair } from "./unified";

const file = (content: string): DiffFile => ({
  oid: hashObject({ type: "blob", content }),
  mode: "100644",
  content,
});
const gone = (path: string, content: string): FilePair => ({
  path,
  before: file(content),
  after: null,
});
const added = (path: string, content: string): FilePair => ({
  path,
  before: null,
  after: file(content),
});

describe("rename detection", () => {
  it("names renames the way a diffstat does", () => {
    expect(renameName("a.txt", "b.txt")).toBe("a.txt => b.txt");
    expect(renameName("docs/faq.md", "archive/faq.md")).toBe(
      "{docs => archive}/faq.md",
    );
    expect(renameName("src/app.js", "src/main.js")).toBe(
      "src/{app.js => main.js}",
    );
    expect(renameName("a/b/c.txt", "a/c.txt")).toBe("a/{b => }/c.txt");
  });

  it("scores how much of the larger file the source supplies", () => {
    const four = "one\ntwo\nthree\nfour\n";
    expect(similarity(file(four), file(`${four}five\n`))).toBe(47500);
    expect(similarity(file("short\n"), file("short\nmuch longer now\n"))).toBe(
      0,
    );
  });

  it("pairs identical blobs first, then the best match above 50%", () => {
    const text = "a\nb\nc\nd\ne\nf\n";
    const pairs = detectRenames([
      gone("old.txt", text),
      gone("other.txt", "x\ny\nz\n"),
      added("new.txt", `${text}g\n`),
      added("same.txt", "x\ny\nz\n"),
      added("unrelated.txt", "nothing in common\n"),
    ]);
    expect(pairs.map((p) => [p.from, p.path, p.similarity])).toEqual([
      ["old.txt", "new.txt", 85],
      ["other.txt", "same.txt", 100],
      [undefined, "unrelated.txt", undefined],
    ]);
  });

  it("uses each source once", () => {
    const pairs = detectRenames([
      gone("a.txt", "same\n"),
      added("b.txt", "same\n"),
      added("c.txt", "same\n"),
    ]);
    expect(pairs.map((p) => p.from ?? "-")).toEqual(["a.txt", "-"]);
  });
});
