import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { asSam, publish, TEAM, TEAM_URL, teamWorld } from "../test/network";
import type { World } from "../types";
import { repoIdFor, repoOf } from "../world/access";

const MINE = repoIdFor("you", "/home/you/team");

function cloned(): World {
  const world = publish(
    asSam(
      teamWorld(),
      'echo "# Team" > README.md && git add . && git commit -q -m "Add README"',
    ),
  );
  return runLine(world, `git clone -q ${TEAM_URL}; cd team`).world;
}

const run = (world: World, line: string) => {
  const ran = runLine(world, line);
  return { world: ran.world, last: ran.outcomes.at(-1) };
};

describe("git push", () => {
  it("moves the remote branch and the remote-tracking branch, with effects", () => {
    const start = run(
      cloned(),
      'echo m > m.txt && git add m.txt && git commit -q -m "Mine"',
    ).world;
    const { world, last } = run(start, "git push");
    const tip = repoOf(world, MINE).refs.get("refs/heads/main" as never);
    expect(repoOf(world, TEAM).refs.get("refs/heads/main" as never)).toBe(tip);
    expect(
      repoOf(world, MINE).refs.get("refs/remotes/origin/main" as never),
    ).toBe(tip);
    expect(last?.effects.map((e) => e.kind)).toEqual([
      "transfer",
      "ref-updated",
      "ref-updated",
    ]);
    expect(last?.effects[0]).toMatchObject({ direction: "push", to: TEAM });
    expect(
      repoOf(world, MINE).reflogs.get("refs/remotes/origin/main")?.at(-1)
        ?.message,
    ).toBe("update by push");
  });

  it("explains a rejected branch that is not the current one", () => {
    const start = run(
      cloned(),
      "git switch -q -c side; git push -q -u origin side; git switch -q main",
    ).world;
    const hosted = publish(
      asSam(
        start,
        'git switch -q -c side && echo s > s.txt && git add s.txt && git commit -q -m "Sam side"',
      ),
    );
    const world = run(
      hosted,
      'git fetch -q; git switch -q side; echo y > y.txt; git add y.txt; git commit -q -m "Mine"; git switch -q main',
    ).world;
    const { last } = run(world, "git push -q origin side");
    expect(last?.output.exitCode).toBe(1);
    expect(last?.output.stderr).toContain(
      " ! [rejected]        side -> side (non-fast-forward)\n",
    );
    expect(last?.output.stderr).toContain(
      "hint: Updates were rejected because a pushed branch tip is behind its remote\n",
    );
    expect(last?.effects.at(-1)).toEqual({
      kind: "refused",
      code: "push-rejected",
    });
  });

  it("refuses without a remote or a branch name", () => {
    const solo = run(teamWorld(), "git init -q solo; cd solo").world;
    expect(run(solo, "git push").last?.output.stderr).toContain(
      "fatal: No configured push destination.\n",
    );
    expect(run(cloned(), "git push origin --delete").last?.output.stderr).toBe(
      "fatal: --delete doesn't make sense without any refs\n",
    );
    expect(
      run(cloned(), "git push --force-with-lease").last?.output.stderr,
    ).toBe("not simulated here: git push --force-with-lease\n");
  });
});
