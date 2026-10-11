import { describe, expect, it } from "vitest";
import { hashObject } from "../objects/hash";
import { resolveHead } from "../refs/refs";
import { runLine } from "../run";
import type {
  Commit,
  FileMode,
  ObjectPool,
  Repo,
  RepoPath,
  World,
} from "../types";
import { createWorld } from "../world/create";
import { defaultMergeMessage } from "./conclude";
import { mergeFile, renderMerge } from "./file";
import { mergeTrees } from "./tree";

/** main and topic, each with one commit on a different file. */
function forked(global?: Record<string, string>): World {
  return createWorld({
    files: { "p/a.txt": "a\n", "p/b.txt": "b\n" },
    cwd: "p",
    ...(global ? { global } : {}),
    setup: [
      "git init -q",
      "git add .",
      'git commit -q -m "Base"',
      "git switch -q -c topic",
      "echo t >> b.txt",
      'git commit -q -am "Topic"',
      "git switch -q main",
      "echo m >> a.txt",
      'git commit -q -am "Main"',
    ],
  });
}

const last = (world: World, line: string) => {
  const ran = runLine(world, line);
  return { world: ran.world, out: ran.outcomes.at(-1)?.output };
};
const headCommit = (world: World) => {
  const repo = [...world.repos.values()][0];
  if (!repo) throw new Error("no repo");
  return world.objects.get(resolveHead(repo) as never) as Commit;
};

describe("git merge", () => {
  it("merges into a detached HEAD and names commits it merges", () => {
    const detached = last(forked(), "git switch -q --detach main").world;
    const { world } = last(detached, "git merge topic");
    expect(headCommit(world).message).toBe("Merge branch 'topic' into HEAD\n");
    const byId = last(forked(), "git merge topic~0").world;
    expect(headCommit(byId).message).toBe("Merge commit 'topic~0'\n");
  });

  it("says when a criss-cross history needs more than one base", () => {
    const crossed = runLine(
      forked(),
      "git merge -q topic && git switch -q topic && git merge -q main~1 && git switch -q main",
    ).world;
    const { out } = last(crossed, "git merge topic");
    expect(out?.exitCode).toBe(1);
    expect(out?.stderr).toContain("more than one merge base");
  });

  it("refuses without an identity and with files too large to merge", () => {
    const anonymous = forked({
      "user.name": "Sam Lee",
      "user.email": "s@e",
      "init.defaultBranch": "main",
    });
    const noEmail = runLine(
      anonymous,
      "git config --global --unset user.email",
    ).world;
    expect(last(noEmail, "git merge topic").out?.exitCode).toBe(128);
    const big = Array.from({ length: 2001 }, (_, i) => `${i}\n`).join("");
    const huge = createWorld({
      files: { "p/a.txt": big },
      cwd: "p",
      setup: [
        "git init -q",
        "git add .",
        'git commit -q -m "Base"',
        "git switch -q -c topic",
        "echo t >> a.txt",
        'git commit -q -am "Topic"',
        "git switch -q main",
        "echo m >> a.txt",
        'git commit -q -am "Main"',
      ],
    });
    expect(last(huge, "git merge topic").out?.stderr).toContain(
      "file too large",
    );
  });
});

describe("three-way file merge", () => {
  it("conflicts when their change starts first (Git 2.45.1)", () => {
    const merged = mergeFile(
      "1\n2\n3\n4\n5\n",
      "1\n2\nA\nA\n5\n",
      "1\nB\nB\n4\n5\n",
      "diff3",
    );
    if (merged.kind !== "text") throw new Error(merged.kind);
    expect(
      renderMerge(merged.chunks, "diff3", {
        ours: "HEAD",
        theirs: "t",
        base: "d97f4ca",
      }),
    ).toBe(
      "1\n<<<<<<< HEAD\n2\nA\nA\n||||||| d97f4ca\n2\n3\n4\n=======\nB\nB\n4\n>>>>>>> t\n5\n",
    );
  });
});

describe("merge pieces", () => {
  const blob = (content: string) => ({ type: "blob" as const, content });
  const file = (content: string, mode: FileMode = "100644") => ({
    oid: hashObject(blob(content)),
    mode,
  });
  const pool: ObjectPool = new Map(
    ["a\n", "a\nb\n", "c\na\n", "x\0", "y\0", "z\0"].map((c) => [
      hashObject(blob(c)),
      blob(c),
    ]),
  );
  const labels = { ours: "HEAD", theirs: "topic", base: "abc1234" };
  const one = (path: string, f: ReturnType<typeof file>) =>
    new Map([[path as RepoPath, f]]);

  it("keeps the side that changed the mode and conflicts on binary files", () => {
    const merged = mergeTrees(
      pool,
      {
        base: one("f", file("a\n")),
        ours: one("f", file("a\nb\n")),
        theirs: one("f", file("c\na\n", "100755")),
      },
      labels,
      "merge",
    );
    if (!merged.ok) throw new Error("too large");
    const outcome = merged.outcomes.get("f" as RepoPath);
    expect(outcome?.kind === "clean" && outcome.file?.mode).toBe("100755");
    const binary = mergeTrees(
      pool,
      {
        base: one("f", file("x\0")),
        ours: one("f", file("y\0")),
        theirs: one("f", file("z\0")),
      },
      labels,
      "merge",
    );
    expect(binary.ok && binary.conflicts).toEqual(["f"]);
  });

  it("names remote-tracking branches in the default message", () => {
    const repo = {
      head: { kind: "symbolic", ref: "refs/heads/main" },
      refs: new Map([["refs/remotes/origin/main", "0".repeat(40)]]),
    } as unknown as Repo;
    expect(defaultMergeMessage(repo, "origin/main")).toBe(
      "Merge remote-tracking branch 'origin/main'\n",
    );
  });

  it("aborts a merge that also merged a file cleanly", () => {
    const world = runLine(
      forked(),
      "echo t2 >> a.txt && git commit -q -am More && git switch -q topic && echo t3 >> a.txt && echo c > c.txt && git add . && git commit -q -m Clash && git switch -q main",
    ).world;
    const merging = last(world, "git merge topic").world;
    const { world: aborted, out } = last(merging, "git merge --abort");
    expect(out?.exitCode).toBe(0);
    expect(last(aborted, "git status --short").out?.stdout).toBe("");
  });
});
