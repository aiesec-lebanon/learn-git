import { describe, expect, it } from "vitest";
import { decorations } from "../format/decorate";
import { formatGitDate } from "../format/date";
import { walkCommits } from "../log/walk";
import { addObjects } from "../objects/pool";
import { hashObject } from "../objects/hash";
import { resolveHead } from "../refs/refs";
import { runLine } from "../run";
import type { Commit, Oid, RefName, World } from "../types";
import { repoOf } from "../world/access";
import { createWorld } from "../world/create";

function run(world: World, line: string) {
  const result = runLine(world, line);
  return { world: result.world, last: result.outcomes.at(-1) };
}

function history(count: number): World {
  let world = run(
    createWorld({ files: { "p/a.txt": "0\n" }, cwd: "p" }),
    "git init -q",
  ).world;
  for (let i = 1; i <= count; i++) {
    world = run(world, `echo ${i} >> a.txt`).world;
    world = run(world, "git add a.txt").world;
    world = run(world, `git commit -q -m C${i}`).world;
  }
  return world;
}

const ID = "you:/home/you/p";

describe("git log", () => {
  it("maps output lines to commits", () => {
    const { last } = run(history(2), "git log");
    expect(last?.meta.lines?.map((l) => l.line)).toEqual([0, 6]);
    const oneline = run(history(3), "git log --oneline").last;
    expect(oneline?.meta.lines?.map((l) => l.line)).toEqual([0, 1, 2]);
  });

  it.each([
    ["git log --all", "not simulated here: git log --all\n"],
    ["git log -p", "not simulated here: git log --patch\n"],
    ["git log main", "not simulated here: git log with revisions or paths\n"],
    [
      "git log --decorate=full",
      "not simulated here: git log --decorate=full\n",
    ],
  ])("%s", (line, out) => {
    expect(run(history(1), line).last?.output.stderr).toBe(out);
  });

  it("answers --graph and show for merges as not simulated", () => {
    const world = history(2);
    const repo = repoOf(world, ID);
    const head = resolveHead(repo) as Oid;
    const tip = world.objects.get(head) as Commit;
    const merge: Commit = { ...tip, parents: [head, ...tip.parents] };
    const { pool } = addObjects(world.objects, [merge]);
    const merged = {
      ...world,
      objects: pool,
      repos: new Map(world.repos).set(ID, {
        ...repo,
        head: { kind: "detached" as const, oid: hashObject(merge) },
      }),
    };
    expect(run(merged, "git log --graph").last?.output.stderr).toBe(
      "not simulated here: git log --graph with merges\n",
    );
    expect(run(merged, "git show").last?.output.stderr).toBe(
      "not simulated here: git show for merge commits\n",
    );
    expect(run(merged, "git log --oneline -1").last?.output.exitCode).toBe(0);
  });

  it("decorates other branches, tags and a detached HEAD", () => {
    const repo = repoOf(history(1), ID);
    const head = resolveHead(repo);
    if (!head) throw new Error("no commit");
    const refs = new Map(repo.refs)
      .set("refs/tags/v1" as RefName, head)
      .set("refs/heads/topic" as RefName, head);
    expect(decorations({ ...repo, refs }, head)).toEqual([
      "HEAD -> main",
      "topic",
      "tag: v1",
    ]);
    expect(
      decorations({ ...repo, head: { kind: "detached", oid: head } }, head),
    ).toEqual(["HEAD", "main"]);
  });
});

describe("dates and ordering", () => {
  it("formats Git's default date with offsets", () => {
    expect(formatGitDate(1767225600, "+0000")).toBe(
      "Thu Jan 1 00:00:00 2026 +0000",
    );
    expect(formatGitDate(1767225600, "-0530")).toBe(
      "Wed Dec 31 18:30:00 2025 -0530",
    );
    expect(formatGitDate(1767225600 + 86400 * 45 + 3723, "+0100")).toBe(
      "Sun Feb 15 02:02:03 2026 +0100",
    );
  });

  it("walks newest first and breaks ties by later arrival", () => {
    const sig = { name: "A", email: "a@example.com", tz: "+0000" };
    const commit = (time: number, parents: Oid[], message: string): Commit => ({
      type: "commit",
      tree: "4b825dc642cb6eb9a060e54bf8d69288fbee4904" as Oid,
      parents,
      author: { ...sig, time },
      committer: { ...sig, time },
      message,
    });
    const base = commit(1, [], "base\n");
    const left = commit(5, [hashObject(base)], "left\n");
    const right = commit(5, [hashObject(base)], "right\n");
    const merge = commit(9, [hashObject(left), hashObject(right)], "merge\n");
    const all = [base, left, right, merge];
    const { pool } = addObjects(new Map(), all);
    const order = walkCommits(
      pool,
      [hashObject(merge)],
      all.map(hashObject),
    ).map((w) => w.commit.message);
    expect(order).toEqual(["merge\n", "right\n", "left\n", "base\n"]);
    expect(walkCommits(pool, [hashObject(merge)], [], 2)).toHaveLength(2);
  });
});
