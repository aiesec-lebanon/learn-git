import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import type { Effect, Oid, RepoId, RepoPath, World } from "../types";
import { createWorld } from "../world/create";
import { describeGraph } from "./describe";
import { narrate } from "./narrate";

const REPO = "you:/home/you/p" as RepoId;

function run(
  lines: string[],
  world: World = createWorld({ files: { "p/a.txt": "a\n" } }),
) {
  let current = world;
  let last = narrate([], current);
  for (const line of lines) {
    const ran = runLine(current, line);
    current = ran.world;
    last = narrate(
      ran.outcomes.flatMap((o) => o.effects),
      current,
    );
  }
  return { world: current, ...last };
}

const words = (s: string) => s.split(/\s+/).length;

describe("narrate", () => {
  it("narrates init, cd, add and the root commit", () => {
    expect(run(["git init p"]).whatHappened).toEqual([
      "Created an empty Git repository in ~/p (the hidden .git folder).",
    ]);
    expect(run(["cd p"]).whatHappened).toEqual(["Moved into ~/p."]);
    expect(run(["cd p", "git init", "git add ."]).whatHappened).toEqual([
      "Stored 1 blob (file contents).",
      "Staged a.txt (new).",
    ]);
    const { whatHappened, announcement } = run([
      "cd p",
      "git init",
      "git add .",
      "git commit -m 'Add the first page'",
    ]);
    expect(whatHappened).toEqual([
      "Stored 1 tree (folder listings).",
      'Recorded commit cea00ff "Add the first page", the first commit (no parent).',
      "main now points at cea00ff.",
    ]);
    expect(announcement).toBe(
      'Committed cea00ff "Add the first page" on main, its first commit.',
    );
  });

  it("announces a later commit with the branch move", () => {
    const { whatHappened, announcement } = run([
      "cd p",
      "git init && git add . && git commit -m one",
      "echo b >> a.txt",
      "git add a.txt",
      "git commit -m 'Add footer'",
    ]);
    expect(whatHappened[1]).toMatch(
      /^Recorded commit (\w{7}) "Add footer", parent (\w{7})\.$/,
    );
    expect(announcement).toMatch(
      /^Committed (\w{7}) "Add footer" on main; main moved from \w{7} to \1\.$/,
    );
  });

  it("narrates files, config and refusals", () => {
    expect(run(["touch b c d e; mkdir f"]).whatHappened).toEqual([
      "Created b, c, d and 1 more.",
      "Created folder f.",
    ]);
    expect(run(["echo x >> p/a.txt"]).whatHappened).toEqual([
      "Changed p/a.txt.",
    ]);
    expect(run(["touch b"]).whatHappened).toEqual(["Created b."]);
    const many = narrate(
      [
        {
          kind: "files-changed",
          machine: "you",
          changes: ["a", "b", "c", "d", "e"].map((n) => ({
            path: `/home/you/${n}`,
            change: "deleted" as const,
            node: "file" as const,
          })),
        },
      ],
      createWorld(),
    );
    expect(many.whatHappened).toEqual(["Deleted a, b, c and 2 more."]);
    expect(run(["git config set --global user.name Ana"]).whatHappened).toEqual(
      ['Set user.name to "Ana" in the global config.'],
    );
    expect(run(["git config unset --global user.name"]).whatHappened).toEqual([
      "Removed user.name from the global config.",
    ]);
    expect(run(["git status"])).toMatchObject({
      whatHappened: [
        "Nothing changed. This folder is not inside a Git repository.",
      ],
      announcement:
        "Nothing changed. This folder is not inside a Git repository.",
    });
    expect(run(["ls"]).whatHappened).toEqual(["Nothing changed."]);
  });

  it("narrates the effect kinds later commands emit", () => {
    const { world } = run([
      "cd p",
      "git init && git add . && git commit -m one",
    ]);
    const oid = world.repos.get(REPO)?.refs.values().next().value as Oid;
    const effects: Effect[] = [
      {
        kind: "head-changed",
        repo: REPO,
        from: { kind: "symbolic", ref: "refs/heads/main" as never },
        to: { kind: "detached", oid },
      },
      {
        kind: "head-changed",
        repo: REPO,
        from: { kind: "detached", oid },
        to: { kind: "symbolic", ref: "refs/heads/main" as never },
      },
      {
        kind: "ref-updated",
        repo: REPO,
        ref: "refs/heads/old" as never,
        from: oid,
        to: null,
      },
      { kind: "operation", repo: REPO, operation: "merge", phase: "started" },
      { kind: "operation", repo: REPO, operation: "rebase", phase: "paused" },
      { kind: "conflict", repo: REPO, paths: ["a.txt" as RepoPath] },
      {
        kind: "transfer",
        from: REPO,
        to: "hub",
        oids: [oid],
        direction: "push",
      },
      { kind: "actor", actor: "Sam" },
      { kind: "repo-created", repo: REPO, reinitialized: true },
      {
        kind: "index-changed",
        repo: REPO,
        changes: [{ path: "a.txt", change: "deleted" }],
      },
      { kind: "screen-cleared" },
    ];
    const short = oid.slice(0, 7);
    expect(narrate(effects, world).whatHappened).toEqual([
      `HEAD is detached at ${short}.`,
      "HEAD now points at main.",
      `old was deleted; it pointed at ${short}.`,
      "The merge was started.",
      "The rebase paused.",
      "Conflicts in a.txt.",
      "Copied 1 object from ~/p to hub.",
      "Sam acted.",
      "The repository in ~/p already existed; nothing was lost.",
      "Staged a.txt (removal).",
    ]);
  });

  it("keeps announcements to 25 words", () => {
    const long = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
    const { announcement } = run([
      "cd p",
      "git init",
      "git add .",
      `git commit -m '${long}'`,
    ]);
    expect(words(announcement)).toBeLessThanOrEqual(25);
    const many = run([
      "touch 1 2 3 4 5; mkdir a b c d; git init x; git init y; git init z",
    ]);
    expect(words(many.announcement)).toBeLessThanOrEqual(25);
  });
});

describe("describeGraph", () => {
  it("describes an unborn branch and a short history", () => {
    const { world: empty } = run(["cd p", "git init"]);
    expect(describeGraph(empty, REPO)).toBe(
      "No commits yet. HEAD points at main, which has no commits yet.",
    );
    const { world } = run([
      "cd p",
      "git init && git add . && git commit -m one",
      "echo b >> a.txt && git commit -m two",
      "git add . && git commit -m two",
    ]);
    expect(describeGraph(world, REPO)).toMatch(
      /^2 commits\. HEAD points at main, at (\w{7}) "two"\. Branches: main at \1\. The oldest is \w{7} "one"\.$/,
    );
  });
});
