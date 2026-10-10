import { describe, expect, it } from "vitest";
import { parseOptions } from "../cli/options";
import { hashObject } from "../objects/hash";
import { addObjects } from "../objects/pool";
import { resolveHead } from "../refs/refs";
import { runLine } from "../run";
import type { Commit, Oid, RefName, Repo, World } from "../types";
import { machineOf, repoOf } from "../world/access";
import { createWorld } from "../world/create";
import { revisionArgs } from "./args";
import { parseRevision } from "./parse";
import { resolveRevision } from "./resolve";

const ID = "you:/home/you/p";

function history(count: number): World {
  let world = runLine(
    createWorld({ files: { "p/a.txt": "0\n" }, cwd: "p" }),
    "git init -q",
  ).world;
  for (let i = 1; i <= count; i++) {
    world = runLine(world, `echo ${i} >> a.txt`).world;
    world = runLine(world, "git add a.txt").world;
    world = runLine(world, `git commit -q -m C${i}`).world;
  }
  return world;
}

const subjectAt = (world: World, repo: Repo, text: string) => {
  const r = resolveRevision(world.objects, repo, text);
  if (!r.ok) return r.reason;
  const commit = world.objects.get(r.oid);
  return commit?.type === "commit" ? commit.message.trim() : commit?.type;
};

describe("parseRevision", () => {
  it.each([
    ["HEAD", { base: "HEAD", steps: [] }],
    ["@", { base: "HEAD", steps: [] }],
    [
      "@~2^",
      {
        base: "HEAD",
        steps: [
          { kind: "ancestor", n: 2 },
          { kind: "parent", n: 1 },
        ],
      },
    ],
    ["main^2", { base: "main", steps: [{ kind: "parent", n: 2 }] }],
    ["main~", { base: "main", steps: [{ kind: "ancestor", n: 1 }] }],
  ])("%s", (text, parsed) => {
    expect(parseRevision(text)).toEqual(parsed);
  });

  it.each(["", "~1", "a..b", "HEAD^{tree}", "HEAD:a.txt", "@{1}", "HEAD~x"])(
    "rejects %s",
    (text) => expect(parseRevision(text)).toBeNull(),
  );
});

describe("resolveRevision", () => {
  const world = history(3);
  const repo = repoOf(world, ID);
  const head = resolveHead(repo) as Oid;

  it.each([
    ["HEAD", "C3"],
    ["@", "C3"],
    ["main", "C3"],
    ["heads/main", "C3"],
    ["refs/heads/main", "C3"],
    ["HEAD~1", "C2"],
    ["HEAD^", "C2"],
    ["HEAD~", "C2"],
    ["HEAD^^", "C1"],
    ["HEAD~2", "C1"],
    ["HEAD^0", "C3"],
    ["HEAD~1^1", "C1"],
    ["HEAD~3", "unknown"],
    ["HEAD^2", "unknown"],
    ["nope", "unknown"],
  ])("%s", (text, expected) => {
    expect(subjectAt(world, repo, text)).toBe(expected);
  });

  it("resolves full and unique short IDs", () => {
    expect(resolveRevision(world.objects, repo, head)).toEqual({
      ok: true,
      oid: head,
    });
    expect(subjectAt(world, repo, head.slice(0, 7))).toBe("C3");
    expect(subjectAt(world, repo, head.slice(0, 3))).toBe("unknown");
  });

  it("prefers tags to branches and branches to remotes", () => {
    const [c1, c2, c3] = ["HEAD~2", "HEAD~1", "HEAD"].map((t) => {
      const r = resolveRevision(world.objects, repo, t);
      return r.ok ? r.oid : head;
    });
    const refs = new Map(repo.refs)
      .set("refs/tags/x" as RefName, c1 as Oid)
      .set("refs/heads/x" as RefName, c2 as Oid)
      .set("refs/remotes/origin/HEAD" as RefName, c3 as Oid)
      .set("refs/remotes/y" as RefName, c2 as Oid);
    const tagged = { ...repo, refs };
    expect(subjectAt(world, tagged, "x")).toBe("C1");
    expect(subjectAt(world, tagged, "origin")).toBe("C3");
    expect(subjectAt(world, tagged, "y")).toBe("C2");
  });

  it("walks the nth parent of a merge and reports an ambiguous short ID", () => {
    const sig = { name: "A", email: "a@example.com", time: 1, tz: "+0000" };
    const commit = (parents: Oid[], message: string): Commit => ({
      type: "commit",
      tree: "4b825dc642cb6eb9a060e54bf8d69288fbee4904" as Oid,
      parents,
      author: sig,
      committer: sig,
      message,
    });
    const left = commit([], "left\n");
    const right = commit([], "right\n");
    const merge = commit([hashObject(left), hashObject(right)], "merge\n");
    const { pool } = addObjects(world.objects, [left, right, merge]);
    const detached: Repo = {
      ...repo,
      head: { kind: "detached", oid: hashObject(merge) },
    };
    const at = (text: string) => {
      const r = resolveRevision(pool, detached, text);
      return r.ok ? pool.get(r.oid) : r.reason;
    };
    expect(at("HEAD^2")).toEqual(right);
    expect(at("HEAD^1")).toEqual(left);
    expect(at("HEAD^3")).toBe("unknown");
    const crowded = new Map(pool)
      .set("abcd000000000000000000000000000000000000" as Oid, left)
      .set("abcd111111111111111111111111111111111111" as Oid, right);
    expect(resolveRevision(crowded, detached, "abcd")).toEqual({
      ok: false,
      reason: "ambiguous-id",
    });
  });

  it("fails on an unborn branch", () => {
    const unborn = runLine(
      createWorld({ dirs: ["p"], cwd: "p" }),
      "git init -q",
    ).world;
    expect(subjectAt(unborn, repoOf(unborn, ID), "HEAD")).toBe("unknown");
  });
});

describe("revisionArgs", () => {
  const world = runLine(history(2), "echo x > main").world;
  const split = (...argv: string[]) => {
    const parsed = parseOptions(argv, []);
    if (!parsed.ok) throw new Error("parse");
    const r = revisionArgs(
      world.objects,
      repoOf(world, ID),
      machineOf(world),
      parsed.options,
    );
    return r.ok
      ? { revs: r.revisions.map((x) => x.text), paths: r.paths }
      : r.stderr;
  };

  it("splits revisions from existing paths", () => {
    expect(split("HEAD~1", "a.txt")).toEqual({
      revs: ["HEAD~1"],
      paths: ["a.txt"],
    });
    expect(split("HEAD", "--", "gone.txt")).toEqual({
      revs: ["HEAD"],
      paths: ["gone.txt"],
    });
    expect(split("*.md")).toEqual({ revs: [], paths: ["*.md"] });
  });

  it("explains Git's ambiguity errors", () => {
    expect(split("nope")).toMatch(
      /^fatal: ambiguous argument 'nope': unknown revision or path not in the working tree\.\nUse '--'/,
    );
    expect(split("main")).toMatch(
      /^fatal: ambiguous argument 'main': both revision and filename\n/,
    );
    expect(split("a.txt", "HEAD")).toMatch(
      /^fatal: HEAD: no such path in the working tree\.\n/,
    );
    expect(split("nope", "--")).toBe("fatal: bad revision 'nope'\n");
    expect(split("0".repeat(40))).toBe(`fatal: bad object ${"0".repeat(40)}\n`);
  });
});
