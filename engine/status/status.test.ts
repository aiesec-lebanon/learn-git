import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import type { World } from "../types";
import { machineOf, repoOf } from "../world/access";
import { createWorld } from "../world/create";
import { computeStatus } from "./compute";

function run(world: World, line: string) {
  const result = runLine(world, line);
  const last = result.outcomes.at(-1);
  return {
    world: result.world,
    out: `${last?.output.stdout ?? ""}${last?.output.stderr ?? ""}`,
  };
}

const start = () =>
  run(
    createWorld({
      files: { "p/new/a.txt": "a\n", "p/b.txt": "b\n" },
      cwd: "p",
    }),
    "git init -q",
  ).world;

describe("git status", () => {
  it("memoizes the comparison per snapshot", () => {
    const world = start();
    const repo = repoOf(world, "you:/home/you/p");
    const fs = machineOf(world).fs;
    expect(computeStatus(world.objects, repo, fs)).toBe(
      computeStatus(world.objects, repo, fs),
    );
  });

  it("shows ./ from inside an untracked folder", () => {
    const inside = run(start(), "cd new").world;
    expect(run(inside, "git status -s").out).toBe("?? ../b.txt\n?? ./\n");
  });

  it("prints porcelain paths from the worktree root", () => {
    const inside = run(run(start(), "git add .").world, "cd new").world;
    expect(run(inside, "git status --porcelain -b").out).toBe(
      "## No commits yet on main\nA  b.txt\nA  new/a.txt\n",
    );
    expect(run(inside, "git status --porcelain=v1").out).toBe(
      "A  b.txt\nA  new/a.txt\n",
    );
    expect(run(inside, "git status -s --long").out).toContain(
      "Changes to be committed:",
    );
  });

  it.each([
    [
      "git status --porcelain=v2",
      "not simulated here: git status --porcelain=v2\n",
    ],
    ["git status -uno", "not simulated here: git status --untracked-files\n"],
    ["git status --ignored", "not simulated here: git status --ignored\n"],
    [
      "git status ../x",
      "fatal: ../x: '../x' is outside repository at '/home/you/p'\n",
    ],
  ])("%s", (line, out) => {
    expect(run(start(), line).out).toBe(out);
  });
});
