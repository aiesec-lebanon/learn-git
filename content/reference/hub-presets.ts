import type { HubAction, SetupStep, WorldSpec } from "@/engine";
import type { ReferencePreset } from "../define";
import { recipeSiteHistory } from "../worlds/recipe-site";
import {
  TEAM_REPO,
  teamRepoConflictingPull,
  teamRepoFeaturePushed,
  teamRepoFixPushed,
} from "../worlds/team-repo";

export const RECIPES_URL = "https://hub.test/you/recipes.git";

export const openPull = (head: string, body = ""): HubAction => ({
  type: "open-pull-request",
  repo: TEAM_REPO,
  base: "main",
  head,
  title: `Merge ${head}`,
  body,
});

export const onPull = (
  type: "merge-pull-request" | "delete-branch" | "restore-branch",
  number = 1,
): HubAction => ({ type, repo: TEAM_REPO, number });

/** The world with more setup, and no scripted teammates: only the card's action happens. */
const after = (world: WorldSpec, ...steps: SetupStep[]): WorldSpec => ({
  ...world,
  setup: [...(world.setup ?? []), ...steps],
  actors: [],
});

const you = (hub: HubAction): SetupStep => ({ machine: "you", hub });
const sam = (hub: HubAction): SetupStep => ({ machine: "sam", hub });

const OPENED = [you(openPull("feature"))];
const APPROVED = [
  ...OPENED,
  sam({ type: "review", repo: TEAM_REPO, number: 1, state: "approved" }),
];
const MERGED = [...APPROVED, you(onPull("merge-pull-request"))];

/** Starting states the Hub cards share. */
export const HUB_PRESETS = {
  local: {
    id: "local",
    label: "Three local commits; origin's address set, nothing hosted yet",
    world: { ...recipeSiteHistory, hub: {} },
    setup: [`git remote add origin ${RECIPES_URL}`],
  },
  taken: {
    id: "taken",
    label: "recipes already exists on the Hub",
    world: after(
      { ...recipeSiteHistory, hub: {} },
      you({ type: "create-repository", name: "recipes" }),
    ),
    setup: [`git remote add origin ${RECIPES_URL}`],
  },
  pushed: {
    id: "pushed",
    label: "feature pushed, no pull request",
    world: after(teamRepoFeaturePushed),
  },
  samsPull: {
    id: "sams-pull",
    label: "Sam's pull request for feature",
    world: after(teamRepoFeaturePushed, sam(openPull("feature"))),
  },
  opened: {
    id: "opened",
    label: "Your pull request, not reviewed yet",
    world: after(teamRepoFeaturePushed, ...OPENED),
  },
  approved: {
    id: "approved",
    label: "Your pull request, approved by Sam",
    world: after(teamRepoFeaturePushed, ...APPROVED),
  },
  conflicts: {
    id: "conflicts",
    label: "Your pull request has conflicts with main",
    world: after(teamRepoConflictingPull),
  },
  merged: {
    id: "merged",
    label: "Pull request #1 merged",
    world: after(teamRepoFeaturePushed, ...MERGED),
  },
  deleted: {
    id: "deleted",
    label: "Merged, and its branch deleted",
    world: after(
      teamRepoFeaturePushed,
      ...MERGED,
      you(onPull("delete-branch")),
    ),
  },
  issue: {
    id: "issue",
    label: "Issue #3 open, fix-footer pushed",
    world: after(teamRepoFixPushed),
  },
  linked: {
    id: "linked",
    label: 'Pull request #4 says "Fixes #3"',
    world: after(teamRepoFixPushed, you(openPull("fix-footer", "Fixes #3"))),
  },
} satisfies Record<string, ReferencePreset>;
