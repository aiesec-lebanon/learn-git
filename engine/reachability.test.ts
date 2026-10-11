import { describe, expect, it } from "vitest";
import { leftBehind, reachability } from "./reachability";
import { resolveHead } from "./refs/refs";
import { runLine } from "./run";
import { createWorld } from "./world/create";

const detachedWork = () =>
  runLine(
    createWorld({
      files: { "p/a.txt": "a\n" },
      cwd: "p",
      setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
    }),
    'git switch -q --detach; echo b >> a.txt; git commit -q -am "Two"; git switch -q main',
  ).world;

describe("reachability", () => {
  it("keeps commits only the reflog reaches apart from live ones", () => {
    const world = detachedWork();
    const repo = [...world.repos.values()][0];
    if (!repo) throw new Error("no repo");
    const found = reachability(world.objects, repo);
    expect(found).toBe(reachability(world.objects, repo));
    expect(found.live.size).toBe(1);
    expect(found.logged.size).toBe(2);
  });

  it("lists nothing left behind when a ref still reaches the commit", () => {
    const world = detachedWork();
    const repo = [...world.repos.values()][0];
    const head = repo && resolveHead(repo);
    if (!repo || !head) throw new Error("no head");
    expect(leftBehind(world.objects, repo, head, null)).toEqual([]);
  });
});
