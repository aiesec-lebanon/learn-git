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

const run = (world: World, line: string) => {
  const ran = runLine(world, line);
  return { world: ran.world, last: ran.outcomes.at(-1) };
};

describe("git pull", () => {
  it("fast-forwards with the fetch lines first and a pull reflog entry", () => {
    const pushed = publish(
      asSam(cloned(), 'echo F >> README.md && git commit -q -am "Fri"'),
    );
    const { world, last } = run(pushed, "git pull");
    expect(last?.output.stderr).toMatch(
      /^From https:\/\/hub.test\/sam\/team\n {3}\w{7}\.\.\w{7} {2}main {7}-> origin\/main\n$/,
    );
    expect(last?.output.stdout).toMatch(
      /^Updating \w{7}\.\.\w{7}\nFast-forward\n/,
    );
    const repo = repoOf(world, MINE);
    expect(repo.reflogs.get("HEAD")?.at(-1)?.message).toBe(
      "pull: Fast-forward",
    );
    expect(repo.reflogs.get("refs/remotes/origin/main")?.at(-1)?.message).toBe(
      "pull: fast-forward",
    );
  });

  it("names the merge after the remote branch, into other branches too", () => {
    const start = run(
      cloned(),
      "git switch -q docs; echo y > y.txt; git add y.txt; git commit -q -m Mine",
    ).world;
    const pushed = publish(
      asSam(
        start,
        'git switch -q docs && echo s > s.txt && git add s.txt && git commit -q -m "Sam"',
      ),
    );
    const { world, last } = run(pushed, "git pull --no-rebase");
    expect(last?.output.stdout).toContain(
      "Merge made by the 'ort' strategy.\n",
    );
    const tip = repoOf(world, MINE).refs.get("refs/heads/docs" as RefName);
    const commit = tip ? world.objects.get(tip) : undefined;
    expect(commit?.type === "commit" && commit.message).toBe(
      "Merge branch 'docs' of https://hub.test/sam/team into docs\n",
    );
  });

  it("follows branch.<name>.rebase before pull.rebase", () => {
    const world = run(
      cloned(),
      "git config pull.rebase true; git config branch.main.rebase false",
    ).world;
    expect(run(world, "git pull").last?.output.exitCode).toBe(0);
    const rebasing = run(cloned(), "git config pull.rebase merges").world;
    expect(run(rebasing, "git pull").last?.output.stderr).toContain(
      "not simulated here",
    );
  });

  it("says when the upstream branch was not fetched", () => {
    const world = run(cloned(), "git switch -q docs").world;
    const hosted = repoOf(world, TEAM);
    const refs = new Map(hosted.refs);
    refs.delete("refs/heads/docs" as RefName);
    const { last } = run(withRepo(world, { ...hosted, refs }), "git pull");
    expect(last?.output).toEqual({
      stdout: "",
      stderr:
        "Your configuration specifies to merge with the ref 'refs/heads/docs'\nfrom the remote, but no such ref was fetched.\n",
      exitCode: 1,
    });
  });
});
