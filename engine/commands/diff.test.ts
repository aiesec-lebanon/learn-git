import { describe, expect, it } from "vitest";
import { diffStat } from "../diff/stat";
import type { DiffFile } from "../diff/unified";
import { hashObject } from "../objects/hash";
import { resolveHead } from "../refs/refs";
import { runLine } from "../run";
import type { World } from "../types";
import { repoOf } from "../world/access";
import { createWorld } from "../world/create";

const ID = "you:/home/you/p";

function twoCommits(): World {
  let world = createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" });
  for (const line of [
    "git init -q",
    "git add a.txt",
    "git commit -q -m one",
    "echo b >> a.txt",
    "git add a.txt",
    "git commit -q -m two",
  ]) {
    world = runLine(world, line).world;
  }
  return world;
}

const stderr = (world: World, line: string) =>
  runLine(world, line).outcomes.at(-1)?.output.stderr;

describe("git diff and git show refusals", () => {
  const world = twoCommits();
  const blob = hashObject({ type: "blob", content: "a\n" });

  it.each([
    ["git diff HEAD HEAD~1 HEAD", "git diff with more than two commits"],
    [`git diff ${blob}`, "git diff of trees or blobs"],
    [`git show ${blob}`, "git show for trees and blobs"],
    ["git diff -w", "git diff --ignore-all-space"],
    ["git show --decorate=full", "git show --decorate=full"],
  ])("%s", (line, what) => {
    expect(stderr(world, line)).toBe(`not simulated here: ${what}\n`);
  });

  it("refuses paths outside the repository", () => {
    expect(stderr(world, "git diff -- ../x")).toBe(
      "fatal: ../x: '../x' is outside repository at '/home/you/p'\n",
    );
  });

  it("shows a commit without its patch and skips unchanged paths", () => {
    const head = resolveHead(repoOf(world, ID));
    const out = runLine(world, "git show -s --no-decorate").outcomes[0];
    expect(out?.output.stdout).toMatch(new RegExp(`^commit ${head}\\n`));
    expect(out?.output.stdout).toMatch(/ {4}two\n$/);
    const none = runLine(world, "git show HEAD -- nothing").outcomes[0];
    expect(none?.output.stdout).toBe("");
  });
});

describe("diffStat scaling", () => {
  const file = (content: string): DiffFile => ({
    oid: hashObject({ type: "blob", content }),
    mode: "100644",
    content,
  });
  const lines = (n: number, tag: string) =>
    Array.from({ length: n }, (_, i) => `${tag}${i}\n`).join("");

  it("scales mostly-deleted files and short changes in wide tables", () => {
    const out = diffStat([
      {
        path: "big.txt",
        before: file(lines(90, "x")),
        after: file(lines(30, "y")),
      },
      { path: "small.txt", before: file("a\n"), after: file("b\n") },
      { path: "same.bin", before: file("\0"), after: file("\0") },
    ]);
    const [big, small, bin, total] = out.split("\n");
    expect(big).toMatch(/^ big\.txt {3}\| 120 \+{16}-{46}$/);
    expect(small).toBe(" small.txt |   2 +-");
    expect(bin).toBe(" same.bin  | Bin 1 -> 1 bytes");
    expect(total).toBe(" 3 files changed, 31 insertions(+), 91 deletions(-)");
  });

  it("prints nothing without changes", () => {
    expect(diffStat([])).toBe("");
  });
});
