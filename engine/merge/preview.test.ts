import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import type { Repo, World } from "../types";
import { createWorld } from "../world/create";
import { previewMerge } from "./preview";

const world = createWorld({
  files: { "p/a.txt": "1\n2\n3\n", "p/b.txt": "b\n" },
  cwd: "p",
  setup: [
    "git init -q",
    "git add .",
    'git commit -q -m "Base"',
    "git switch -q -c ahead",
    "echo t >> b.txt",
    'git commit -q -am "Ahead"',
    "git switch -q -c clash main",
    "echo X > a.txt",
    'git commit -q -am "Clash"',
    "git switch -q main",
  ],
});
const repoOf = (w: World) => [...w.repos.values()][0] as Repo;
const preview = (w: World, name: string, noFF = false) =>
  previewMerge(w.objects, repoOf(w), name, noFF);

describe("merge preview", () => {
  it("tells fast-forward, up to date and unknown names apart", () => {
    expect(preview(world, "ahead").kind).toBe("fast-forward");
    expect(preview(world, "main").kind).toBe("up-to-date");
    expect(preview(world, "nope").kind).toBe("unknown");
    expect(preview(world, "ahead", true).kind).toBe("merge");
  });

  it("lists each file's source and the conflicts of a true merge", () => {
    const diverged = runLine(
      world,
      "echo Y > a.txt && git commit -q -am Mine && git merge -q ahead",
    ).world;
    const result = preview(diverged, "clash");
    if (result.kind !== "merge") throw new Error(result.kind);
    expect(result.conflicts).toEqual(["a.txt"]);
    expect(result.files.map((f) => [f.path, f.from])).toEqual([
      ["a.txt", "conflict"],
      ["b.txt", "ours"],
    ]);
    const clean = preview(
      runLine(world, "echo m >> b.txt && git commit -q -am M").world,
      "clash",
    );
    expect(clean.kind === "merge" && clean.files.map((f) => f.from)).toEqual([
      "theirs",
      "ours",
    ]);
  });
});
