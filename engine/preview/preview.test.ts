import { describe, expect, it } from "vitest";
import { createWorld, resolveHead, type Oid, type World } from "../index";
import { commitSnapshot, firstParentChain } from "./chain";
import { rewriteMessage } from "./rewrite-message";

function threeCommits() {
  const world: World = createWorld({
    files: { "p/a.txt": "a\n" },
    cwd: "p",
    setup: [
      "git init",
      "git add .",
      'git commit -m "One"',
      "echo b > b.txt",
      "git add b.txt",
      'git commit -m "Two"',
      "echo more >> a.txt",
      "rm b.txt",
      'git commit -am "Three"',
    ],
  });
  const repo = [...world.repos.values()][0];
  const tip = repo && resolveHead(repo);
  if (!tip) throw new Error("no commits");
  return { pool: world.objects, tip };
}

describe("history previews", () => {
  it("walks the first-parent chain oldest first", () => {
    const { pool, tip } = threeCommits();
    const chain = firstParentChain(pool, tip);
    expect(chain).toHaveLength(3);
    expect(chain.at(-1)).toBe(tip);
    expect(chain.map((oid) => commitSnapshot(pool, oid).subject)).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("marks each snapshot's files against the parent", () => {
    const { pool, tip } = threeCommits();
    const [one, two, three] = firstParentChain(pool, tip) as [Oid, Oid, Oid];
    expect(commitSnapshot(pool, one).files).toEqual([
      { path: "a.txt", content: "a\n", change: "added" },
    ]);
    expect(commitSnapshot(pool, two).files.map((f) => f.change)).toEqual([
      null,
      "added",
    ]);
    const last = commitSnapshot(pool, three);
    expect(last.files).toEqual([
      { path: "a.txt", content: "a\nmore\n", change: "modified" },
    ]);
    expect(last.deleted).toEqual(["b.txt"]);
  });

  it("ripples a changed message into every later ID, and only those", () => {
    const { pool, tip } = threeCommits();
    const chain = firstParentChain(pool, tip);
    const [one, two] = chain as [Oid, Oid];
    const first = rewriteMessage(pool, tip, one, "Uno\n");
    expect(first.map((r) => r.old)).toEqual(chain);
    expect(first.every((r) => r.new !== r.old)).toBe(true);
    const second = rewriteMessage(pool, tip, two, "Dos\n");
    expect(second[0]?.new).toBe(one);
    expect(second.slice(1).every((r) => r.new !== r.old)).toBe(true);
    const same = rewriteMessage(pool, tip, one, "One\n");
    expect(same.every((r) => r.new === r.old)).toBe(true);
    expect(pool.size).toBe(threeCommits().pool.size);
  });
});
