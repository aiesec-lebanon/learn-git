import { describe, expect, it } from "vitest";
import { cleanupMessage, subjectOf } from "../commit/message";
import { execute } from "../execute";
import { resolveHead } from "../refs/refs";
import { runLine } from "../run";
import type { World } from "../types";
import { repoOf, withRepo } from "../world/access";
import { createWorld } from "../world/create";

function run(world: World, line: string) {
  const result = runLine(world, line);
  const last = result.outcomes.at(-1);
  return {
    world: result.world,
    last,
    out: `${last?.output.stdout ?? ""}${last?.output.stderr ?? ""}`,
  };
}

const staged = () =>
  run(
    run(createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" }), "git init -q")
      .world,
    "git add a.txt",
  ).world;

const ID = "you:/home/you/p";

describe("git commit", () => {
  it("emits objects, then the branch move, and records arrival", () => {
    const { world, last } = run(staged(), "git commit -q -m First");
    expect(last?.effects.map((e) => e.kind)).toEqual([
      "object-written",
      "object-written",
      "ref-updated",
    ]);
    const repo = repoOf(world, ID);
    expect(repo.arrival).toEqual([resolveHead(repo)]);
  });

  it("commits on a detached HEAD and moves HEAD itself", () => {
    const first = run(staged(), "git commit -q -m First").world;
    const repo = repoOf(first, ID);
    const oid = resolveHead(repo);
    if (!oid) throw new Error("no commit");
    const detached = withRepo(first, {
      ...repo,
      head: { kind: "detached", oid },
    });
    const changed = run(
      run(detached, "echo b >> a.txt").world,
      "git add a.txt",
    ).world;
    const { world, out, last } = run(changed, "git commit -m Second");
    expect(out).toMatch(
      /^\[detached HEAD [0-9a-f]{7}\] Second\n 1 file changed, 1 insertion\(\+\)\n$/,
    );
    expect(repoOf(world, ID).head.kind).toBe("detached");
    expect(repoOf(world, ID).reflogs.get("HEAD")?.at(-1)?.message).toBe(
      "commit: Second",
    );
    expect(last?.effects.at(-1)).toMatchObject({ kind: "head-changed" });
  });

  it.each([
    ["git commit --amend -m x", "not simulated here: git commit --amend\n"],
    ["git commit -i -m x a.txt", "not simulated here: git commit --include\n"],
    [`git commit -m ${"x".repeat(1990)}`, ""],
  ])("%s", (line, out) => {
    expect(run(staged(), line).out.startsWith(out)).toBe(true);
  });

  it("refuses messages over the cap", () => {
    const words = ["git", "commit", "-m", "y".repeat(10_001)].map((text) => ({
      text,
    }));
    expect(execute(staged(), { words }).output.stderr).toBe(
      "not simulated here: commit messages over 10000 characters\n",
    );
  });

  it("summarizes binary files without line counts", () => {
    const world = run(
      run(
        createWorld({ files: { "p/logo.png": "PNG\0" }, cwd: "p" }),
        "git init -q",
      ).world,
      "git add .",
    ).world;
    expect(run(world, "git commit -m Logo").out).toContain(
      " 1 file changed, 0 insertions(+), 0 deletions(-)\n create mode 100644 logo.png\n",
    );
  });
});

describe("commit messages", () => {
  it("cleans whitespace like Git's -m default", () => {
    expect(cleanupMessage(["\n\n  Title  \n\n\n\nBody\t\n\n"])).toBe(
      "  Title\n\nBody\n",
    );
    expect(cleanupMessage(["A", "B"])).toBe("A\n\nB\n");
    expect(cleanupMessage(["", " \n "])).toBe("");
    expect(subjectOf("one\ntwo\n\nbody\n")).toBe("one two");
  });
});
