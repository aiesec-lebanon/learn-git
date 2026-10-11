import type { TargetSpec } from "@/engine";
import { defineScenario, writeFile } from "../define";
import { MENU_AGREED } from "../worlds/bake-sale";
import { teamRepoMonday } from "../worlds/team-repo";

const YOURS = "Lower the lemon cake price";
const SAMS = "Raise the lemon cake price";
const MERGE = `git commit -m "Merge Sam's price"`;

const BOTH = {
  yours: { name: "your Friday commit", message: YOURS },
  sam: { name: "Sam's weekend commit", message: SAMS },
} as const;

/** Sam's commit and yours joined by a merge commit on main. */
const MERGED = {
  repo: "bake-sale",
  commits: {
    ...BOTH,
    merge: {
      name: "the merge",
      parents: ["yours", "sam"],
      files: { "menu.html": true },
    },
  },
  exact: false,
  branches: { main: "merge" },
  clean: true,
} satisfies TargetSpec;

/** Your commit replayed on top of Sam's. */
const REBASED = {
  repo: "bake-sale",
  commits: {
    sam: BOTH.sam,
    replayed: {
      name: "your replayed commit",
      parents: ["sam"],
      message: YOURS,
    },
  },
  exact: false,
  branches: { main: "replayed" },
  clean: true,
} satisfies TargetSpec;

export default defineScenario({
  id: "s-b3",
  brief: {
    from: "Sam",
    message:
      "Morning. Over the weekend I raised the lemon cake price on main and pushed it. Can you get your Friday change onto main too? We can agree the price once you see both.",
  },
  goal: `Get your Friday commit, ${YOURS}, onto origin's main. Sam's weekend commit stays there too.`,
  world: teamRepoMonday,
  acts: [
    {
      id: "fetch",
      title: "Sam's commit is here",
      goal: "Push your commit. When origin refuses, bring Sam's commit over and look at both.",
      targets: [
        {
          repo: "bake-sale",
          commits: BOTH,
          exact: false,
          branches: { main: "yours" },
          remotes: { origin: { main: "sam" } },
        },
      ],
      hints: {
        nudge:
          "Origin's main has a commit you have never seen. Which command brings it over without touching your files?",
        pointer:
          "git fetch downloads origin's new commits and moves origin/main. Your main and your files stay as they are, and git status compares the two.",
        reference: "fetch",
        next: "Run git fetch, then git status to see that main and origin/main have diverged.",
      },
    },
    {
      id: "combine",
      title: "Both prices met",
      goal: "Bring Sam's commit into your main and settle the lemon cake price.",
      targets: [MERGED, REBASED],
      hints: {
        nudge:
          "Your main and origin/main each have a commit the other lacks. How do two lines of work become one?",
        pointer:
          "git merge origin/main joins them with a merge commit. Both commits change the lemon cake line, so Git pauses for you to choose the price.",
        reference: "merge",
        next: `Run git merge origin/main, settle the price line in menu.html without the markers, then git add menu.html and ${MERGE}.`,
      },
    },
    {
      id: "push",
      title: "Origin has both",
      goal: "Push main. Origin keeps Sam's commit and gains yours.",
      targets: [
        { ...MERGED, remotes: { origin: { main: "merge" } } },
        { ...REBASED, remotes: { origin: { main: "replayed" } } },
      ],
      hints: {
        nudge: "Does origin's main have your work yet?",
        pointer:
          "Your main now contains Sam's commit, so a push only adds commits and origin accepts it. A force push would erase Sam's commit, which is why the Hub refuses one.",
        next: "Run git push.",
      },
    },
  ],
  experts: [
    {
      title: "Fetch, look, then merge",
      solution: [
        "git fetch",
        "git status",
        "git merge origin/main",
        writeFile("menu.html", MENU_AGREED),
        "git add menu.html",
        MERGE,
        "git push",
      ],
      tradeoffs:
        "Fetching first lets you look before anything changes: git status says the branches have diverged. The merge commit records that two lines of work met. A force push would have replaced Sam's commit with yours, and the Hub refuses that on main.",
    },
    {
      title: "Pull with a merge",
      solution: [
        "git pull --no-rebase",
        writeFile("menu.html", MENU_AGREED),
        "git add menu.html",
        MERGE,
        "git push",
      ],
      tradeoffs:
        "git pull --no-rebase is git fetch and git merge in one command. Fewer steps, but you meet the conflict before you have looked at Sam's commit.",
    },
  ],
});
