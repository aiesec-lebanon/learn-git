import type { HubAction, TargetSpec } from "@/engine";
import { defineScenario, writeFile, type Step } from "../define";
import {
  PULL_OPENED,
  README_SETUP_FIXED,
  SETUP_ISSUE,
  TEAM_REPO,
  TEAM_URL,
  teamRepoFirstDay,
} from "../worlds/team-repo";

const PULL = SETUP_ISSUE + 1;
const BRANCH = "fix-readme";
const WORDED = README_SETUP_FIXED.replace(
  "in a browser.",
  "in your browser to preview the site.",
);

const review = (state: "changes-requested" | "approved"): HubAction => ({
  type: "review",
  repo: TEAM_REPO,
  number: PULL,
  state,
  ...(state === "approved"
    ? { body: "Perfect. Welcome aboard." }
    : {
        body: "Thanks for picking this up.",
        comments: [
          {
            path: "README.md",
            line: 7,
            body: "Could it say what opening it is for, e.g. 'to preview the site'?",
          },
        ],
      }),
});

const merged = {
  pulls: [{ head: BRANCH, base: "main", state: "merged" }],
  issues: { [SETUP_ISSUE]: "closed" },
} as const;

const OPEN: HubAction = {
  type: "open-pull-request",
  repo: TEAM_REPO,
  base: "main",
  head: BRANCH,
  title: "Fix the setup step",
  body: `Fixes #${SETUP_ISSUE}`,
};

/** From the pull request opening to a clean, up-to-date main. */
const AFTER_PUSH: readonly Step[] = [
  OPEN,
  writeFile("README.md", WORDED),
  'git commit -am "Say what opening the page is for"',
  "git push",
  { type: "merge-pull-request", repo: TEAM_REPO, number: PULL },
  { type: "delete-branch", repo: TEAM_REPO, number: PULL },
  "git switch main",
  "git pull",
  `git branch -d ${BRANCH}`,
];

const CLONE = [`git clone ${TEAM_URL}`, "cd bake-sale"];
const FIX = [
  writeFile("README.md", README_SETUP_FIXED),
  'git commit -am "Fix the setup step"',
];

const tidy: TargetSpec = {
  repo: "bake-sale",
  commits: {
    setup: { name: "Sam's setup commit", message: "Add the setup steps" },
    merge: {
      name: "the pull request's merge commit",
      parents: ["setup", "tip"],
    },
    tip: { name: "your last commit on the branch" },
  },
  exact: false,
  branches: { main: "merge", [BRANCH]: null },
  remotes: { origin: { main: "merge", [BRANCH]: null } },
  hub: { origin: merged },
  head: { branch: "main" },
  clean: true,
};

export default defineScenario({
  id: "s-b1",
  brief: {
    from: "Sam",
    message: `Welcome to the team. A first task: the README's setup step names the wrong file (issue #${SETUP_ISSUE}, it's yours). Main only takes changes through a reviewed pull request, and I'll review.`,
  },
  goal: `Clone ${TEAM_URL}, fix the setup step on a branch named ${BRANCH}, and get it merged through a pull request that closes #${SETUP_ISSUE}. Finish on an up-to-date main without the branch.`,
  world: {
    ...teamRepoFirstDay,
    actors: [
      {
        id: "sam-review",
        machine: "sam",
        name: "Sam",
        trigger: { kind: "after-command", pattern: PULL_OPENED },
        when: "after you open the pull request",
        run: [review("changes-requested")],
        says: `Sam requested changes on #${PULL}: could the setup step say what opening the page is for?`,
      },
      {
        id: "sam-approve",
        machine: "sam",
        name: "Sam",
        trigger: { kind: "pull-updated", repo: TEAM_REPO, number: PULL },
        when: "after you push the change",
        run: [review("approved")],
        says: `Sam approved #${PULL}.`,
      },
    ],
  },
  acts: [
    {
      id: "open",
      title: "Pull request open",
      goal: `Fix the README on ${BRANCH}, push the branch and open a pull request into main.`,
      targets: [
        {
          repo: "bake-sale",
          hub: {
            origin: {
              pulls: [{ head: BRANCH, base: "main", state: "open" }],
            },
          },
        },
      ],
      hints: {
        nudge: `Origin's main refuses direct pushes. Where can your fix live so that Sam can review it?`,
        pointer: `Commit the fix on a branch, push it with -u so it tracks origin's copy, then open a pull request on the Hub whose description says "Fixes #${SETUP_ISSUE}".`,
        reference: "push",
        next: `Run git switch -c ${BRANCH}, commit the fix, git push -u origin ${BRANCH}, then open a pull request into main.`,
      },
    },
    {
      id: "merged",
      title: "Merged, issue closed",
      goal: "Address Sam's review, then merge once he approves.",
      targets: [{ repo: "bake-sale", hub: { origin: merged } }],
      hints: {
        nudge:
          "Sam asked for a change. Where does a change to a pull request come from?",
        pointer:
          "The pull request follows its branch: commit the change on the branch and push, and it appears in the pull request. Main needs Sam's approval before it merges.",
        reference: "push",
        next: `Edit README.md as Sam asks, commit, git push, wait for the approval, then merge pull request #${PULL}.`,
      },
    },
    {
      id: "tidy",
      title: "Main up to date",
      goal: `Delete ${BRANCH} on the Hub and in your repository, and bring main up to date.`,
      targets: [tidy],
      hints: {
        nudge:
          "The merge happened on origin. What does your main know about it?",
        pointer:
          "Delete the branch on the Hub, then switch to main and pull to bring the merge commit home. git branch -d removes a branch that is already merged.",
        reference: "pull",
        next: `Delete the branch on the Hub, then git switch main, git pull and git branch -d ${BRANCH}.`,
      },
    },
  ],
  experts: [
    {
      title: "Branch first",
      solution: [
        ...CLONE,
        `git switch -c ${BRANCH}`,
        ...FIX,
        `git push -u origin ${BRANCH}`,
        ...AFTER_PUSH,
      ],
      tradeoffs:
        "Branching before the first commit keeps main identical to origin's the whole time, and -u links the branch on its first push so later pushes need no arguments.",
    },
    {
      title: "Committed on main first",
      solution: [
        ...CLONE,
        ...FIX,
        "git push",
        `git switch -c ${BRANCH}`,
        "git push",
        `git push -u origin ${BRANCH}`,
        ...AFTER_PUSH,
      ],
      tradeoffs:
        "The protected main refuses the push, and a branch made from there carries the commit along. A plain git push of the new branch stops with Git's hint about the upstream. Your main stays one commit ahead until the pull, which then fast-forwards it.",
    },
  ],
});
