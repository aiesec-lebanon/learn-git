import { describe, expect, it } from "vitest";
import {
  stageEntry,
  stagedEntry,
  stagedFiles,
  unstagePath,
  indexEntries,
  conflictedPaths,
  EMPTY_INDEX,
} from "../staging/index";
import type { Fs, IndexEntry, Oid, RepoPath } from "../types";
import { withEntry, withoutEntry } from "../util/cow";
import { quotePath } from "./quote";
import {
  isGitPath,
  listDir,
  makeDir,
  removeFile,
  removeTree,
  worktreeFiles,
  writeFile,
} from "./worktree";

const empty: Fs = {
  files: new Map(),
  dirs: new Set(["/", "/home", "/home/you"]),
};

describe("machine files", () => {
  it("writes files with their folders and lists folders first-class", () => {
    let fs = writeFile(empty, "/home/you/p/src/a.ts", "a");
    fs = writeFile(fs, "/home/you/p/b.txt", "b");
    fs = makeDir(fs, "/home/you/p/.git");
    fs = makeDir(fs, "/home/you/p/empty");
    expect(makeDir(fs, "/home/you/p/empty")).toBe(fs);
    expect(fs.dirs.has("/home/you/p/src")).toBe(true);
    expect(listDir(fs, "/home/you/p")).toEqual([
      { name: ".git", dir: true },
      { name: "b.txt", dir: false },
      { name: "empty", dir: true },
      { name: "src", dir: true },
    ]);
    expect([...worktreeFiles(fs, "/home/you/p")]).toEqual([
      ["b.txt", "b"],
      ["src/a.ts", "a"],
    ]);
    expect(worktreeFiles(fs, "/home/you/p")).toBe(
      worktreeFiles(fs, "/home/you/p"),
    );
    expect(empty.files.size).toBe(0);
  });

  it("removes files and whole folders", () => {
    let fs = writeFile(empty, "/home/you/p/src/a.ts", "a");
    fs = writeFile(fs, "/home/you/p/b.txt", "b");
    expect(
      removeFile(fs, "/home/you/p/b.txt").files.has("/home/you/p/b.txt"),
    ).toBe(false);
    const pruned = removeTree(fs, "/home/you/p/src");
    expect([...pruned.files.keys()]).toEqual(["/home/you/p/b.txt"]);
    expect(pruned.dirs.has("/home/you/p/src")).toBe(false);
    expect(pruned.dirs.has("/home/you/p")).toBe(true);
    expect(isGitPath("a/.git/config")).toBe(true);
    expect(isGitPath("a/.github/x")).toBe(false);
  });
});

describe("quotePath", () => {
  it.each([
    ["plain.txt", "plain.txt"],
    ["my file.txt", "my file.txt"],
    ["café notes.txt", '"caf\\303\\251 notes.txt"'],
    ['say"hi', '"say\\"hi"'],
    ["back\\slash", '"back\\\\slash"'],
    ["tab\there", '"tab\\there"'],
    ["new\nline", '"new\\nline"'],
    ["\x01", '"\\001"'],
    ["\x7f", '"\\177"'],
  ])("%j -> %s", (path, quoted) => {
    expect(quotePath(path)).toBe(quoted);
  });
});

describe("staging area", () => {
  const entry = (path: string, stage: 0 | 1 | 2 | 3 = 0): IndexEntry => ({
    path: path as RepoPath,
    oid: "a".repeat(40) as Oid,
    mode: "100644",
    stage,
  });

  it("keeps entries in Git's order and replaces conflict stages", () => {
    let index = stageEntry(EMPTY_INDEX, entry("b"));
    index = stageEntry(index, entry("a/x"));
    index = stageEntry(index, entry("a.txt"));
    index = withEntry(index, "c" as RepoPath, [entry("c", 1), entry("c", 3)]);
    expect(indexEntries(index).map((e) => `${e.path}:${e.stage}`)).toEqual([
      "a.txt:0",
      "a/x:0",
      "b:0",
      "c:1",
      "c:3",
    ]);
    expect(conflictedPaths(index)).toEqual(["c"]);
    expect(stagedEntry(index, "c" as RepoPath)).toBeUndefined();
    expect([...stagedFiles(index).keys()]).toEqual(["a.txt", "a/x", "b"]);
    const resolved = stageEntry(index, entry("c"));
    expect(conflictedPaths(resolved)).toEqual([]);
    expect(unstagePath(resolved, "b" as RepoPath).has("b" as RepoPath)).toBe(
      false,
    );
  });

  it("copies maps only when something changes", () => {
    const map = new Map([["k", 1]]);
    expect(withEntry(map, "k", 1)).toBe(map);
    expect(withoutEntry(map, "x")).toBe(map);
    expect(withoutEntry(map, "k").size).toBe(0);
  });
});
