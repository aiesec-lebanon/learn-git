import type { HubAction, TargetSpec } from "@/engine";
import { defineScenario, writeFile } from "../define";
import { MENU_AGREED } from "../worlds/bake-sale";
import { TEAM_REPO, teamRepoConflictingPull } from "../worlds/team-repo";

const YOURS = "Lower the lemon cake price";
const SAMS = "Raise the lemon cake price";
const COMMIT = 'git commit -m "Merge origin/main into price-fix"';
const MERGE_PULL: HubAction = {
  type: "merge-pull-request",
  repo: TEAM_REPO,
  number: 1,
};

const BOTH = {
  yours: { name: "your price commit", message: YOURS },
  sam: { name: "Sam's price commit", message: SAMS },
} as const;

/** price-fix joins Sam's commit and yours, conflict settled. */
const branchMerged = {
  repo: "bake-sale",
  commits: {
    ...BOTH,
    merge: {
      name: "the merge on price-fix",
      parents: ["yours", "sam"],
      files: { "menu.html": true },
    },
  },
  exact: false,
  branches: { "price-fix": "merge" },
  clean: true,
} satisfies TargetSpec;

export default defineScenario({
  id: "s-b4",
  brief: {
    from: "Sam",
    message:
      "I raised the lemon cake price on main before I saw your pull request, sorry. Now #1 says it has conflicts. Can you sort it out on your branch so we can merge it?",
  },
  goal: "Make pull request #1 (price-fix into main) mergeable without touching main yourself, agree a lemon cake price, and merge it.",
  world: teamRepoConflictingPull,
  acts: [
    {
      id: "fetch",
      title: "Sam's commit is here",
      goal: "Bring Sam's commit on origin's main into your repository.",
      targets: [
        { repo: "bake-sale", commits: { sam: BOTH.sam }, exact: false },
      ],
      hints: {
        nudge:
          "The conflict is between your branch and origin's main. Do you have origin's newest main yet?",
        pointer:
          "git fetch downloads Sam's commit and moves origin/main without touching your branch.",
        reference: "fetch",
        next: "Run git fetch.",
      },
    },
    {
      id: "merge",
      title: "Conflict settled on price-fix",
      goal: "Merge origin/main into price-fix and settle the price. Merge into your branch, not into main.",
      targets: [branchMerged],
      hints: {
        nudge:
          "Which branch should change: the one the pull request proposes, or main?",
        pointer:
          "On price-fix, git merge origin/main brings Sam's commit into your branch. Both commits change the lemon cake line, so Git pauses for you to choose. If you merged the wrong way round, Rewind takes it back.",
        reference: "merge",
        next: `On price-fix run git merge origin/main, settle the price line in menu.html, then git add menu.html and ${COMMIT}.`,
      },
    },
    {
      id: "push",
      title: "Pull request mergeable",
      goal: "Push price-fix so the pull request sees the resolution.",
      targets: [
        { ...branchMerged, remotes: { origin: { "price-fix": "merge" } } },
      ],
      hints: {
        nudge: "Does the Hub know about your merge yet?",
        pointer:
          "The pull request follows price-fix on origin. Pushing the merge commit makes it mergeable.",
        reference: "push",
        next: "Run git push.",
      },
    },
    {
      id: "merged",
      title: "Merged",
      goal: "Merge pull request #1 on the Hub.",
      targets: [
        {
          repo: "bake-sale",
          hub: {
            origin: {
              pulls: [{ head: "price-fix", base: "main", state: "merged" }],
            },
          },
        },
      ],
      hints: {
        nudge: "What does the pull request's merge box say now?",
        pointer:
          "With no conflicts left, the Hub can make the merge commit on main itself.",
        next: "Merge pull request #1 on the Hub.",
      },
    },
  ],
  experts: [
    {
      title: "Fetch, then merge origin/main into the branch",
      solution: [
        "git fetch",
        "git merge origin/main",
        writeFile("menu.html", MENU_AGREED),
        "git add menu.html",
        COMMIT,
        "git push",
        MERGE_PULL,
      ],
      tradeoffs:
        "Fetching first shows origin/main moving before anything changes. The merge happens on your branch, so main only changes through the reviewed pull request. Merging price-fix into your local main instead would leave the pull request conflicted and main ahead of origin; Rewind undoes it.",
    },
    {
      title: "Pull origin's main into the branch",
      solution: [
        "git pull --no-rebase origin main",
        writeFile("menu.html", MENU_AGREED),
        "git add menu.html",
        COMMIT,
        "git push",
        MERGE_PULL,
      ],
      tradeoffs:
        "git pull --no-rebase origin main fetches and merges in one go, from your branch. Fewer commands, but you meet the conflict before you have looked at Sam's commit.",
    },
  ],
});
