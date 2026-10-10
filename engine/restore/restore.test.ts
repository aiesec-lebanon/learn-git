import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { Session } from "../session";
import type { World } from "../types";
import { createWorld } from "../world/create";
import { overwrites } from "./preview";

function committed(): World {
  let world = createWorld({
    files: { "p/a.txt": "a\n", "p/b.txt": "b\n" },
    cwd: "p",
  });
  for (const line of [
    "git init -q",
    "git add .",
    "git commit -q -m one",
    "echo 2 >> a.txt",
    "git commit -q -a -m two",
  ]) {
    world = runLine(world, line).world;
  }
  return world;
}

const last = (world: World, line: string) =>
  runLine(world, line).outcomes.at(-1);

describe("restore and its legacy forms", () => {
  it.each([
    ["git checkout main", "git checkout of a branch or commit (yet)"],
    ["git checkout", "git checkout of a branch or commit (yet)"],
    ["git checkout -b topic", "git checkout -b"],
    ["git reset HEAD~1", "git reset to another commit (yet)"],
    ["git reset --hard", "git reset --hard"],
    ["git restore -p a.txt", "git restore --patch"],
  ])("%s is not simulated", (line, what) => {
    expect(last(committed(), line)?.output.stderr).toBe(
      `not simulated here: ${what}\n`,
    );
  });

  it("maps legacy forms to restore with a note", () => {
    const world = runLine(committed(), "echo x >> a.txt").world;
    const checkout = last(world, "git checkout HEAD~1 -- a.txt");
    expect(checkout?.notes).toEqual([
      "Older form of: git restore --source=HEAD~1 --staged --worktree a.txt",
    ]);
    const reset = last(checkout?.world ?? world, "git reset HEAD~1 a.txt");
    expect(reset?.notes).toEqual([
      "Older form of: git restore --source=HEAD~1 --staged a.txt",
    ]);
    expect(last(world, "git checkout a.txt")?.notes).toEqual([
      "Older form of: git restore a.txt",
    ]);
    expect(last(world, "git reset")?.notes).toEqual([
      "Older form of: git restore --staged .",
    ]);
  });

  it("refuses unknown commits and paths outside the repository", () => {
    const world = committed();
    expect(last(world, "git checkout nope -- a.txt")?.output.stderr).toMatch(
      /^fatal: ambiguous argument 'nope': unknown revision/,
    );
    expect(last(world, "git reset nope --")?.output.exitCode).toBe(128);
    for (const line of [
      "git checkout -- ../x",
      "git reset -- ../x",
      "git restore ../x",
    ]) {
      expect(last(world, line)?.output.stderr, line).toMatch(
        /is outside repository/,
      );
    }
    expect(
      last(world, "git restore --source=HEAD:a.txt a.txt")?.output.stderr,
    ).toBe("fatal: could not resolve HEAD:a.txt\n");
  });

  it("restores from a tree too and deletes files missing from the source", () => {
    const world = runLine(committed(), "echo n > n.txt && git add n.txt").world;
    const out = last(
      world,
      "git restore --source=HEAD~1 --staged --worktree .",
    );
    expect(out?.effects.map((e) => e.kind)).toEqual([
      "index-changed",
      "files-changed",
    ]);
    const status = last(out?.world ?? world, "git status --short");
    expect(status?.output.stdout).toBe("M  a.txt\n");
  });
});

describe("overwrite preview", () => {
  it("names the files a restore would replace and whether Git keeps them", () => {
    const world = runLine(committed(), "echo x >> a.txt && rm b.txt").world;
    const session = new Session(world);
    const [entry] = session.preview("git restore a.txt b.txt");
    expect(overwrites(world, entry?.outcome.world ?? world)).toEqual([
      { path: "/home/you/p/a.txt", lost: true },
    ]);
    const staged = runLine(world, "git add a.txt").world;
    const [again] = new Session(staged).preview(
      "git restore --source=HEAD a.txt",
    );
    expect(overwrites(staged, again?.outcome.world ?? staged)).toEqual([
      { path: "/home/you/p/a.txt", lost: false },
    ]);
  });
});
