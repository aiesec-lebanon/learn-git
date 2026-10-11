import type { HubAction } from "@/engine";
import { defineCapstone, writeFile } from "../define";
import {
  FOOTER_ISSUE,
  INDEX_FOOTER_FIXED,
  PULL_OPENED,
  REVIEWED_MAIN,
  TEAM_REPO,
  teamRepoFooter,
} from "../worlds/team-repo";

const PULL = FOOTER_ISSUE + 1;
const SEE_MENU = INDEX_FOOTER_FIXED.replace(">Menu<", ">See the menu<");

const review = (state: "changes-requested" | "approved"): HubAction => ({
  type: "review",
  repo: TEAM_REPO,
  number: PULL,
  state,
  ...(state === "approved"
    ? { body: "Thanks, merge away." }
    : {
        body: "One small thing.",
        comments: [
          {
            path: "index.html",
            line: 5,
            body: "Could the link say 'See the menu'?",
          },
        ],
      }),
});

export default defineCapstone({
  chapter: "b6",
  goal: "File an issue on the Hub for the broken footer link. Fix it on a branch named fix-footer and open a pull request into main that closes the issue when it merges. Sam reviews: address his comment, merge once he approves, then delete the branch on the Hub and in your repository and bring main up to date.",
  world: {
    ...teamRepoFooter,
    hub: REVIEWED_MAIN,
    actors: [
      {
        id: "sam-review",
        machine: "sam",
        name: "Sam",
        trigger: { kind: "after-command", pattern: PULL_OPENED },
        when: "after you open the pull request",
        run: [review("changes-requested")],
        says: `Sam requested changes on #${PULL}: could the link say 'See the menu'?`,
      },
      {
        id: "sam-approve",
        machine: "sam",
        name: "Sam",
        trigger: { kind: "pull-updated", repo: TEAM_REPO, number: PULL },
        when: "after you push the fix",
        run: [review("approved")],
        says: `Sam approved #${PULL}.`,
      },
    ],
  },
  target: {
    repo: "bake-sale",
    commits: {
      footer: { name: "Sam's footer commit", message: "Add a footer" },
      merge: {
        name: "the pull request's merge commit",
        parents: ["footer", "fix"],
      },
      fix: { name: "your last fix commit" },
    },
    exact: false,
    branches: { main: "merge", "fix-footer": null },
    remotes: { origin: { main: "merge", "fix-footer": null } },
    hub: {
      origin: {
        pulls: [{ head: "fix-footer", base: "main", state: "merged" }],
        issues: { [FOOTER_ISSUE]: "closed" },
      },
    },
    head: { branch: "main" },
    clean: true,
  },
  solution: [
    {
      type: "open-issue",
      repo: TEAM_REPO,
      title: "The footer's menu link is broken",
      labels: ["bug"],
    },
    "git switch -c fix-footer",
    writeFile("index.html", INDEX_FOOTER_FIXED),
    'git commit -am "Fix the footer link"',
    "git push -u origin fix-footer",
    {
      type: "open-pull-request",
      repo: TEAM_REPO,
      base: "main",
      head: "fix-footer",
      title: "Fix the footer link",
      body: `Fixes #${FOOTER_ISSUE}`,
    },
    writeFile("index.html", SEE_MENU),
    'git commit -am "Say where the link goes"',
    "git push",
    { type: "merge-pull-request", repo: TEAM_REPO, number: PULL },
    { type: "delete-branch", repo: TEAM_REPO, number: PULL },
    "git switch main",
    "git pull",
    "git branch -d fix-footer",
  ],
  hints: {
    nudge:
      "Which number will your issue get, and what must the pull request's description say so that merging closes it?",
    pointer:
      'Open the issue first, then push fix-footer and open a pull request into main saying "Fixes #3". Each push to fix-footer updates the pull request, and the merge happens on origin, so main needs a pull afterwards.',
    reference: "push",
    next: 'Issue, then git switch -c fix-footer, commit, git push -u origin fix-footer, a pull request with "Fixes #3", commit and git push the change Sam asks for, merge, delete the branch, git switch main, git pull and git branch -d fix-footer.',
  },
});
