import { describe, expect, it } from "vitest";
import { createWorld, type World } from "@/engine";
import { lostIfDeleted, lostIfLeaving, reachedFrom } from "./reach";
import { repoView } from "./view-model";

const viewOf = (world: World) => {
  const repo = [...world.repos.values()][0];
  if (!repo) throw new Error("no repo");
  return repoView(world, repo);
};

const forked = (extra: readonly string[] = []) =>
  createWorld({
    files: { "p/a.txt": "a\n" },
    cwd: "p",
    setup: [
      "git init -q",
      "git add .",
      'git commit -q -m "One"',
      "git switch -q -c dark",
      "echo d >> a.txt",
      'git commit -q -am "Dark"',
      "git switch -q main",
      "echo m >> a.txt",
      'git commit -q -am "Fix"',
      ...extra,
    ],
  });

const subjects = (list: readonly { subject: string }[]) =>
  list.map((c) => c.subject);

describe("reach", () => {
  it("lists what a label reaches, newest first", () => {
    const world = forked();
    const view = viewOf(world);
    expect(subjects(reachedFrom(world, view, "dark"))).toEqual(["Dark", "One"]);
    expect(subjects(reachedFrom(world, view, "HEAD"))).toEqual(["Fix", "One"]);
    expect(reachedFrom(world, view, "nope")).toEqual([]);
  });

  it("finds the commits only a branch reaches", () => {
    const world = forked();
    const view = viewOf(world);
    expect(subjects(lostIfDeleted(world, view, "dark"))).toEqual(["Dark"]);
    expect(lostIfDeleted(world, view, "main")).toEqual([]);
    expect(lostIfDeleted(world, view, "nope")).toEqual([]);
  });

  it("finds what leaving a detached HEAD leaves behind", () => {
    const attached = forked();
    expect(lostIfLeaving(attached, viewOf(attached))).toEqual([]);
    const world = forked([
      "git switch -q --detach",
      "echo x >> a.txt",
      'git commit -q -am "Try"',
    ]);
    expect(subjects(lostIfLeaving(world, viewOf(world)))).toEqual(["Try"]);
  });
});
