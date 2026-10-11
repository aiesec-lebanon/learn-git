import { runLine } from "../run";
import type { World } from "../types";
import { repoIdFor, repoOf, withRepo } from "../world/access";
import { createWorld } from "../world/create";
import { hostedRepoId, transfer } from "../world/network";

export const TEAM_URL = "https://hub.test/sam/team.git";
export const TEAM = hostedRepoId("sam/team");
const SAM_REPO = repoIdFor("sam", "/home/sam/s");

/** Sam's machine with a repository at `~/s`, and an empty `sam/team` on the Hub. */
export function teamWorld(): World {
  return createWorld({
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
    setup: [{ machine: "sam", run: "mkdir s && cd s && git init -q" }],
  });
}

/** Runs a line in Sam's repository. */
export const asSam = (world: World, line: string) =>
  runLine(world, `cd /home/sam/s; ${line}`, "sam").world;

/** Sam's branches published on the Hub without `git push` (a unit-test shortcut). */
export function publish(world: World): World {
  const sam = repoOf(world, SAM_REPO);
  const sent = transfer(world, sam.id, TEAM, [...sam.refs.values()], "push");
  return withRepo(sent.world, { ...repoOf(sent.world, TEAM), refs: sam.refs });
}
