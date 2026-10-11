import { act } from "../hub/actions";
import { hostedRepo } from "../hub/state";
import type { HubAction, PullRequest, World } from "../types";
import { createWorld } from "../world/create";

export const SHOP = "sam/shop";

/**
 * `sam/shop` on the Hub with `main` (menu.txt: one, two, three) and
 * `feature` (adds four), both pushed from the learner's clone `~/shop`;
 * Sam has a machine, so his account commits as "Sam".
 */
export function shopWorld(): World {
  return createWorld({
    machines: {
      sam: {
        global: { "user.name": "Sam", "user.email": "sam@team.test" },
      },
    },
    hub: { [SHOP]: {} },
    setup: [
      "git clone -q https://hub.test/sam/shop.git",
      "cd shop && echo one > menu.txt && echo two >> menu.txt && echo three >> menu.txt",
      'git add . && git commit -q -m "Add the menu" && git push -q -u origin main',
      "git switch -q -c feature && echo four >> menu.txt",
      'git add . && git commit -q -m "Add four" && git push -q -u origin feature',
    ],
  });
}

/** Runs a Hub action as `actor` (the learner by default) and returns its outcome. */
export const hub = (world: World, action: HubAction, actor = "you") =>
  act(world, { kind: "hub", actor, action });

/** Opens feature → main in `sam/shop` as the learner. */
export const withPull = (world: World = shopWorld(), body = "") =>
  hub(world, {
    type: "open-pull-request",
    repo: SHOP,
    base: "main",
    head: "feature",
    title: "Add four",
    body,
  }).world;

export const pullOf = (world: World, number: number): PullRequest => {
  const pull = hostedRepo(world, SHOP).pulls.find((p) => p.number === number);
  if (!pull) throw new Error(`No pull request #${number}`);
  return pull;
};
