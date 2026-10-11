import { describe, expect, it } from "vitest";
import { createWorld, runLine, type World } from "@/engine";
import { branchCounters, pushRejected, wouldLose } from "./counters.model";

const URL = "https://hub.test/sam/team.git";
const team = (): World =>
  createWorld({
    machines: {
      sam: {
        global: {
          "user.name": "Sam",
          "user.email": "sam@team.test",
          "init.defaultBranch": "main",
        },
      },
    },
    hub: { "sam/team": {} },
    setup: [
      {
        machine: "sam",
        run: `git clone -q ${URL} && cd team && echo a > a.txt && git add . && git commit -q -m One && git push -q`,
      },
      `git clone -q ${URL}`,
      "cd team",
    ],
  });

const samPushes = (world: World) =>
  runLine(
    world,
    "cd /home/sam/team; echo b >> a.txt; git commit -q -am Fridays; git push -q",
    "sam",
  ).world;
const mine = (world: World) =>
  runLine(world, "echo m > m.txt; git add m.txt; git commit -q -m Mine").world;

describe("ahead and behind counters", () => {
  it("list what a push sends and what a pull brings", () => {
    const world = runLine(samPushes(mine(team())), "git fetch -q").world;
    const counters = branchCounters(world);
    expect(counters?.ahead.map((c) => c.subject)).toEqual(["Mine"]);
    expect(counters?.behind.map((c) => [c.subject, c.author])).toEqual([
      ["Fridays", "Sam"],
    ]);
    expect(
      branchCounters(runLine(world, "git switch -q -c solo").world),
    ).toBeNull();
  });

  it("show what a forced push would remove after a rejection", () => {
    const world = samPushes(mine(team()));
    const ran = runLine(world, "git push");
    expect(pushRejected(ran.outcomes.flatMap((o) => o.effects))).toBe(true);
    expect(wouldLose(ran.world)).toMatchObject({
      remote: "origin",
      branch: "main",
      lost: [{ subject: "Fridays", author: "Sam" }],
    });
    expect(wouldLose(team())?.lost).toEqual([]);
  });
});
