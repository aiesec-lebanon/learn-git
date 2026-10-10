import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import type { Oid, RepoPath, World } from "../types";
import { repoOf, withRepo } from "../world/access";
import { createWorld } from "../world/create";

function run(world: World, line: string) {
  const result = runLine(world, line);
  return { world: result.world, last: result.outcomes.at(-1) };
}

const start = () =>
  run(createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" }), "git init -q")
    .world;

describe("git add", () => {
  it("writes blobs and reports index changes once", () => {
    const first = run(start(), "git add a.txt");
    expect(first.last?.effects).toEqual([
      {
        kind: "object-written",
        repo: "you:/home/you/p",
        oid: "78981922613b2afb6025042ff6bd878ac1994e85",
        type: "blob",
      },
      {
        kind: "index-changed",
        repo: "you:/home/you/p",
        from: "worktree",
        changes: [{ path: "a.txt", change: "added" }],
      },
    ]);
    expect(run(first.world, "git add a.txt").last?.effects).toEqual([]);
  });

  it("resolves conflict stages", () => {
    const world = start();
    const repo = repoOf(world, "you:/home/you/p");
    const oid = "1".repeat(40) as Oid;
    const conflicted = withRepo(world, {
      ...repo,
      index: new Map([
        [
          "a.txt" as RepoPath,
          [
            { path: "a.txt" as RepoPath, oid, mode: "100644", stage: 2 },
            { path: "a.txt" as RepoPath, oid, mode: "100644", stage: 3 },
          ],
        ],
      ]),
    });
    const resolved = run(conflicted, "git add a.txt");
    expect(
      repoOf(resolved.world, repo.id).index.get("a.txt" as RepoPath),
    ).toHaveLength(1);
    expect(resolved.last?.effects.at(-1)).toMatchObject({
      changes: [{ path: "a.txt", change: "modified" }],
    });
  });

  it.each(["-n", "-p", "--chmod=+x", "-N"])(
    "answers %s as not simulated",
    (flag) => {
      expect(run(start(), `git add ${flag} a.txt`).last?.output).toMatchObject({
        exitCode: 1,
        stderr: expect.stringMatching(/^not simulated here: git add --/),
      });
    },
  );

  it("accepts -f while no ignore rules exist", () => {
    expect(run(start(), "git add -f a.txt").last?.output.exitCode).toBe(0);
  });
});
