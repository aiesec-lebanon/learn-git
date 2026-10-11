import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { asSam, publish, TEAM, TEAM_URL, teamWorld } from "../test/network";
import type { RefName, World } from "../types";
import { repoIdFor, repoOf, withRepo } from "../world/access";

const MINE = repoIdFor("you", "/home/you/team");

function cloned(): World {
  const world = publish(
    asSam(
      teamWorld(),
      'echo "# Team" > README.md && git add . && git commit -q -m "Add README" && git switch -q -c docs && echo d > docs.txt && git add . && git commit -q -m "Add docs" && git switch -q main',
    ),
  );
  return runLine(world, `git clone -q ${TEAM_URL}; cd team`).world;
}

const out = (world: World, line: string) =>
  runLine(world, line).outcomes.at(-1)?.output.stdout;
const after = (world: World, line: string) => runLine(world, line).world;
const mine = (world: World) =>
  after(world, 'echo m > m.txt && git add m.txt && git commit -q -m "Mine"');
const samPushes = (world: World) =>
  after(
    publish(asSam(world, 'echo F >> README.md && git commit -q -am "Fri"')),
    "git fetch -q",
  );

describe("upstream tracking", () => {
  it("reports up to date, ahead, behind and diverged in status", () => {
    const world = cloned();
    expect(out(world, "git status")).toBe(
      "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean\n",
    );
    expect(out(mine(world), "git status")).toBe(
      "On branch main\nYour branch is ahead of 'origin/main' by 1 commit.\n  (use \"git push\" to publish your local commits)\n\nnothing to commit, working tree clean\n",
    );
    expect(out(samPushes(world), "git status")).toBe(
      "On branch main\nYour branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.\n  (use \"git pull\" to update your local branch)\n\nnothing to commit, working tree clean\n",
    );
    const diverged = samPushes(mine(world));
    expect(out(diverged, "git status")).toBe(
      "On branch main\nYour branch and 'origin/main' have diverged,\nand have 1 and 1 different commits each, respectively.\n  (use \"git pull\" if you want to integrate the remote branch with yours)\n\nnothing to commit, working tree clean\n",
    );
    expect(out(diverged, "git status -sb")).toBe(
      "## main...origin/main [ahead 1, behind 1]\n",
    );
    expect(out(diverged, "git branch -v")).toMatch(
      /^\* main \w{7} \[ahead 1, behind 1\] Mine\n$/,
    );
    expect(out(diverged, "git branch -vv")).toMatch(
      /^\* main \w{7} \[origin\/main: ahead 1, behind 1\] Mine\n$/,
    );
  });

  it("leaves the divergence advice out of the commit template", () => {
    const diverged = samPushes(mine(cloned()));
    const ran = runLine(
      diverged,
      "echo x >> m.txt && git add m.txt && git commit",
    );
    const request = ran.outcomes.at(-1)?.request;
    expect(request?.kind === "editor" && request.initial).toContain(
      "# On branch main\n# Your branch and 'origin/main' have diverged,\n# and have 1 and 1 different commits each, respectively.\n#\n# Changes to be committed:\n",
    );
  });

  it("creates a tracking branch when switching to a remote branch's name", () => {
    const ran = runLine(cloned(), "git switch docs");
    expect(ran.outcomes.at(-1)?.output).toEqual({
      stdout: "branch 'docs' set up to track 'origin/docs'.\n",
      stderr: "Switched to a new branch 'docs'\n",
      exitCode: 0,
    });
    const repo = repoOf(ran.world, MINE);
    expect(repo.config.slice(-2)).toEqual([
      { key: "branch.docs.remote", value: "origin" },
      { key: "branch.docs.merge", value: "refs/heads/docs" },
    ]);
    expect(repo.reflogs.get("refs/heads/docs")?.[0]?.message).toBe(
      "branch: Created from refs/remotes/origin/docs",
    );
    const legacy = runLine(cloned(), "git checkout docs").outcomes.at(-1);
    expect(legacy?.output.stdout).toBe(
      "branch 'docs' set up to track 'origin/docs'.\n",
    );
  });

  it("reports a gone upstream when switching and listing", () => {
    const world = after(cloned(), "git switch -q docs; git switch -q main");
    const hosted = repoOf(world, TEAM);
    const refs = new Map(hosted.refs);
    refs.delete("refs/heads/docs" as RefName);
    const pruned = after(
      withRepo(world, { ...hosted, refs }),
      "git fetch -q --prune",
    );
    const ran = runLine(pruned, "git switch docs").outcomes.at(-1);
    expect(ran?.output.stdout).toBe(
      "Your branch is based on 'origin/docs', but the upstream is gone.\n  (use \"git branch --unset-upstream\" to fixup)\n",
    );
    const on = after(pruned, "git switch -q docs");
    expect(out(on, "git status -sb")).toBe("## docs...origin/docs [gone]\n");
    expect(out(on, "git branch -vv")).toMatch(
      /^\* docs \w{7} \[origin\/docs: gone\] Add docs\n {2}main \w{7} \[origin\/main\] Add README\n$/,
    );
  });

  it("lists remote-tracking branches with -a and -r", () => {
    const world = cloned();
    expect(out(world, "git branch -a")).toBe(
      "* main\n  remotes/origin/HEAD -> origin/main\n  remotes/origin/docs\n  remotes/origin/main\n",
    );
    expect(out(world, "git branch -r")).toBe(
      "  origin/HEAD -> origin/main\n  origin/docs\n  origin/main\n",
    );
    expect(out(world, "git branch -rv")).toMatch(
      /^ {2}origin\/HEAD -> origin\/main\n {2}origin\/docs \w{7} Add docs\n {2}origin\/main \w{7} Add README\n$/,
    );
    expect(out(world, "git branch -av")).toMatch(
      /^\* main {16}\w{7} Add README\n/,
    );
  });
});
