import { describe, expect, it } from "vitest";
import { resolveHead } from "../refs/refs";
import { createWorld } from "../world/create";
import { repoOf } from "../world/access";
import type { Oid, RefName } from "../types";
import { patchId, rebaseTodo } from "./todo";

const world = createWorld({
  files: { "p/a.txt": "1\n2\n3\n4\n5\n6\n7\n8\n9\n" },
  cwd: "p",
  setup: [
    "git init -q",
    "git add .",
    'git commit -q -m "First"',
    "git switch -q -c topic",
    "echo t > t.txt",
    "git add t.txt",
    'git commit -q -m "Add t"',
    "echo u > u.txt",
    "git add u.txt",
    'git commit -q -m "Add u"',
    "git switch -q main",
    "echo m >> a.txt",
    'git commit -q -am "Main"',
    "echo u > u.txt",
    "git add u.txt",
    'git commit -q -m "Same u"',
  ],
});
const repo = repoOf(world, "you:/home/you/p");
const ref = (name: string) =>
  repo.refs.get(`refs/heads/${name}` as RefName) as Oid;

describe("the rebase todo", () => {
  it("replays the branch's own commits oldest first and skips patches upstream has", () => {
    const todo = rebaseTodo(world.objects, ref("main"), ref("topic"));
    const topic = ref("topic");
    const commit = world.objects.get(topic);
    const parent = commit?.type === "commit" ? commit.parents[0] : undefined;
    expect(todo.picks).toEqual([parent]);
    expect(todo.skipped).toEqual([topic]);
  });

  it("matches patches regardless of where the change sits", () => {
    expect(patchId(world.objects, ref("topic"))).toBe(
      patchId(world.objects, resolveHead(repo) as Oid),
    );
  });
});
