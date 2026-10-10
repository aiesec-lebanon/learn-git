import { describe, expect, it } from "vitest";
import type { TargetSpec } from "@/engine";
import { describeTarget, targetView } from "./target";

const target: TargetSpec = {
  commits: {
    fix: {
      name: "the fix",
      parents: ["base"],
      files: { "a.txt": "x", "b.txt": null },
    },
    base: { name: "the start", parents: [], files: { "a.txt": true } },
  },
  branches: { main: "fix", old: null },
  head: { branch: "main" },
  paths: { "c.txt": "untracked" },
  config: { "user.name": "Sam Lee" },
  clean: true,
};

describe("checkpoint target", () => {
  it("draws commits parents first, as ghosts, with branch labels and HEAD", () => {
    const view = targetView(target);
    expect(view?.commits.map((c) => [c.oid, c.parents, c.ghost])).toEqual([
      ["target:base", [], 1],
      ["target:fix", ["target:base"], 1],
    ]);
    expect(view?.labels.map((l) => [l.name, l.target])).toEqual([
      ["main", "target:fix"],
    ]);
    expect(view?.head).toEqual({
      kind: "branch",
      branch: "main",
      target: "target:fix",
    });
    expect(targetView({ clean: true })).toBeNull();
  });

  it("says the same in sentences", () => {
    expect(describeTarget(target)).toEqual([
      "A commit, the start, with no parent, containing a.txt.",
      "A commit, the fix, on top of the start, containing a.txt, without b.txt.",
      "main points to the fix.",
      "There is no branch called old.",
      "HEAD is on main.",
      "c.txt is untracked.",
      "user.name is Sam Lee.",
      "Nothing is left to commit.",
    ]);
  });
});
