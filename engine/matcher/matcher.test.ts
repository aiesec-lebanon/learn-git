import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import { countPar } from "../par";
import { shortRefName } from "../refs/names";
import { Session } from "../session";
import type { World, WorldSpec } from "../types";
import { createWorld } from "../world/create";
import { match } from "./match";
import type { CommitTarget, TargetSpec } from "./target";

function play(spec: WorldSpec, lines: readonly string[]) {
  const session = new Session(createWorld(spec));
  for (const line of lines) session.run(line);
  return session;
}

const B11: WorldSpec = {
  files: { "site/README.md": "# Site\n", "site/index.html": "<h1>Hi</h1>\n" },
  cwd: "site",
};
const B11_TARGET: TargetSpec = {
  commits: {
    first: {
      name: "the first commit",
      parents: [],
      files: { "README.md": true, "index.html": true },
    },
  },
  branches: { main: "first" },
  clean: true,
};

const B12: WorldSpec = {
  files: { "p/README.md": "teh\n", "p/app.js": "v1\n" },
  cwd: "p",
};
const B12_SETUP = [
  "git init && git add . && git commit -m start",
  "echo the > README.md; echo v2 >> app.js; touch notes.txt",
];
const B12_TARGET: TargetSpec = {
  commits: {
    start: { parents: [] },
    fix: {
      name: "the typo fix",
      parents: ["start"],
      files: { "README.md": "the\n", "app.js": "v1\n" },
    },
  },
  branches: { main: "fix" },
  head: { branch: "main" },
  paths: { "app.js": "modified", "notes.txt": "untracked" },
};

const world = (s: Session) => s.getSnapshot().world;

describe("match", () => {
  it("accepts B1.1 by any path and explains what is missing", () => {
    expect(match(world(play(B11, [])), B11_TARGET)).toMatchObject({
      ok: false,
      differences: ["There is no Git repository in this folder yet."],
    });
    const halfway = play(B11, ["git init", "git add README.md"]);
    expect(match(world(halfway), B11_TARGET).differences).toEqual([
      "The branch main does not exist yet.",
      "No commit matches the first commit yet.",
      "The history should have 1 commit; it has 0.",
      "The working tree should be clean; README.md, index.html still differ.",
    ]);
    const done = play(B11, [
      "git init",
      "git add .",
      "git commit -m 'Add site'",
    ]);
    const report = match(world(done), B11_TARGET);
    expect(report).toMatchObject({ ok: true, differences: [] });
    expect(report.bindings.get("first")).toMatch(/^[0-9a-f]{40}$/);
  });

  it("checks B1.2: only the typo fix in the new commit", () => {
    const right = play(B12, [
      ...B12_SETUP,
      "git add README.md",
      "git commit -m fix",
    ]);
    expect(match(world(right), B12_TARGET).ok).toBe(true);
    const wrong = play(B12, [...B12_SETUP, "git add .", "git commit -m fix"]);
    expect(match(world(wrong), B12_TARGET).differences).toEqual([
      "In the typo fix, app.js should have the target content.",
      "app.js should be modified and not staged; it is unchanged since the last commit.",
      "notes.txt should be untracked; it is unchanged since the last commit.",
    ]);
    const staged = play(B12, [...B12_SETUP, "git add README.md app.js"]);
    expect(match(world(staged), B12_TARGET).differences).toEqual([
      "No commit matches commit start yet.",
      "In the typo fix, README.md should have the target content.",
      "the typo fix should have 1 parent; it has 0.",
      "The history should have 2 commits; it has 1.",
      "app.js should be modified and not staged; it is staged.",
    ]);
  });

  it("binds unanchored commits by content, messages only when asked", () => {
    const s = play(B12, [
      "git init && git add . && git commit -m one",
      "echo v2 >> app.js && git add . && git commit -m two",
      "echo v3 >> app.js && git add . && git commit -m three",
    ]);
    const target: TargetSpec = {
      exact: false,
      commits: {
        mid: { files: { "app.js": "v1\nv2\n" }, message: "two" },
        root: { parents: [] },
      },
      worktree: { "app.js": "v1\nv2\nv3\n", "gone.txt": null },
      config: { "user.name": "Sam Lee", "init.defaultBranch": "main" },
    };
    expect(match(world(s), target).ok).toBe(true);
    const renamed = {
      ...target,
      commits: { mid: { files: { "app.js": "v1\nv2\n" }, message: "2" } },
    };
    expect(match(world(s), renamed).differences).toEqual([
      "No commit matches commit mid yet.",
    ]);
    expect(
      match(world(s), {
        branches: { feature: null, main: "x" },
        head: { detached: "x" },
        config: { "user.email": null },
      }).differences,
    ).toEqual([
      "HEAD should be detached at commit x.",
      "user.email should not be set.",
    ]);
  });

  it("reports branches, HEAD, files and config that differ", () => {
    const s = play(B12, ["git init && git add . && git commit -m one"]);
    const w = world(s);
    expect(
      match(w, {
        repo: "p",
        commits: { a: { name: "A" }, b: { name: "B", parents: ["a", "a"] } },
        branches: { main: "a", other: null, master: "b" },
        head: { branch: "dev" },
        worktree: { "app.js": "v9\n", "new.txt": true },
        config: { "user.name": "Ana" },
      }).differences,
    ).toEqual([
      "The branch master does not exist yet.",
      "HEAD should point at dev.",
      "No commit matches B yet.",
      "The history should have 2 commits; it has 1.",
      "In the working tree, app.js should have the target content.",
      "In the working tree, new.txt should exist.",
      'user.name should be set to "Ana".',
    ]);
    expect(
      match(w, {
        commits: { a: { name: "A" }, b: { name: "B" } },
        branches: { main: "a" },
        head: { detached: "b" },
        exact: false,
      }).differences,
    ).toEqual(["HEAD should be detached at B.", "No commit matches B yet."]);
    expect(match(w, { repo: "elsewhere" }).differences).toEqual([
      "There is no Git repository in elsewhere yet.",
    ]);
  });

  it("names commits that collide or are reached two ways", () => {
    const s = play(B12, [
      "git init && git add . && git commit -m one",
      "echo v2 >> app.js && git add . && git commit -m two",
    ]);
    const w = world(s);
    const repo = [...w.repos.values()][0];
    const tip = repo?.refs.values().next().value;
    if (!repo || !tip) throw new Error("no repo");
    const twoBranches: World = {
      ...w,
      repos: new Map([
        [
          repo.id,
          {
            ...repo,
            refs: new Map([...repo.refs, ["refs/heads/x" as never, tip]]),
            head: { kind: "detached", oid: tip },
          },
        ],
      ]),
    };
    expect(
      match(twoBranches, {
        commits: {
          a: { name: "A", parents: ["r"] },
          b: { name: "B" },
          r: { name: "R", parents: ["a"] },
        },
        branches: { main: "a", x: "b", other: null },
        head: { detached: "r" },
      }).differences,
    ).toEqual([
      "R is reached through two different commits.",
      "A and B should be different commits.",
      "R should have 1 parent; it has 0.",
      "The history should have 3 commits; it has 2.",
    ]);
  });

  it("is reflexive: a world matches the target that describes it", () => {
    const steps = [
      "git add .",
      "git add a.txt",
      "git commit -m c",
      "echo x >> a.txt",
      "echo y >> b.txt",
      "touch c.txt",
      "rm a.txt",
    ];
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...steps), { maxLength: 10 }),
        (lines) => {
          const w = world(
            play({ files: { "p/a.txt": "a\n" }, cwd: "p" }, [
              "git init",
              ...lines,
            ]),
          );
          expect(match(w, targetOf(w)).differences).toEqual([]);
        },
      ),
      { numRuns: 50 },
    );
  });
});

/** A target that states everything about a world's only repository. */
function targetOf(w: World): TargetSpec {
  const repo = [...w.repos.values()][0];
  if (!repo) throw new Error("no repo");
  const commits: Record<string, CommitTarget> = {};
  for (const oid of repo.arrival) {
    const commit = readObject(w.objects, oid, "commit");
    const files: Record<string, string> = {};
    for (const [path, file] of flattenTree(w.objects, commit.tree))
      files[path] = readObject(w.objects, file.oid, "blob").content;
    commits[oid] = {
      parents: commit.parents,
      files,
      message: commit.message.split("\n")[0] ?? "",
    };
  }
  return {
    commits,
    branches: Object.fromEntries(
      [...repo.refs].map(([ref, oid]) => [shortRefName(ref), oid]),
    ),
    head:
      repo.head.kind === "symbolic"
        ? { branch: shortRefName(repo.head.ref) }
        : { detached: repo.head.oid },
  };
}

describe("countPar", () => {
  it("counts successful state-changing commands only", () => {
    const s = play(B11, [
      "git status",
      "git init",
      "git config get user.name",
      "git add nope",
      "ls; git add .",
      "git commit -m one",
      "git commit -m again",
      "git log",
    ]);
    expect(countPar(s.getSnapshot().history)).toBe(3);
    s.rewindTo(4);
    expect(countPar(s.getSnapshot().history)).toBe(1);
  });
});
