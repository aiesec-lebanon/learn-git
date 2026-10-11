import type { HubAction, TargetSpec } from "@/engine";
import { defineLesson, writeFile } from "../../define";
import {
  FOOTER_ISSUE,
  INDEX_FOOTER_FIXED,
  TEAM_REPO,
  teamRepoFixPushed,
  teamRepoFooter,
  teamRepoIssues,
} from "../../worlds/team-repo";

const DATED = "# Volunteers\n\nSaturday 10:00.\n\nSam: setup. Ana: cash box.\n";

const pullInto = (
  base: string,
  head: string,
  title: string,
  body: string,
): HubAction => ({
  type: "open-pull-request",
  repo: TEAM_REPO,
  base,
  head,
  title,
  body,
});
const merge = (number: number): HubAction => ({
  type: "merge-pull-request",
  repo: TEAM_REPO,
  number,
});

const FIX_FOOTER = [
  "git switch -c fix-footer",
  writeFile("index.html", INDEX_FOOTER_FIXED),
  'git commit -am "Fix the footer link"',
  "git push -u origin fix-footer",
];

/** The footer issue closed and a pull request from fix-footer merged into main. */
const closedByPull: TargetSpec = {
  repo: "bake-sale",
  hub: {
    origin: {
      pulls: [{ head: "fix-footer", base: "main", state: "merged" }],
      issues: { [FOOTER_ISSUE]: "closed" },
    },
  },
};

export default defineLesson({
  id: "b6-3",
  world: teamRepoIssues,
  beats: [
    {
      id: "anatomy",
      run: [
        {
          type: "comment",
          repo: TEAM_REPO,
          number: FOOTER_ISSUE,
          body: "I can take this one.",
        },
      ],
    },
    {
      id: "keywords",
      run: [
        ...FIX_FOOTER,
        pullInto(
          "main",
          "fix-footer",
          "Fix the footer link",
          `The menu link now points to menu.html.\n\nFixes #${FOOTER_ISSUE}`,
        ),
      ],
    },
    { id: "merge", run: [merge(4)] },
    {
      id: "default-only",
      run: [
        {
          type: "open-issue",
          repo: TEAM_REPO,
          title: "Put the date on the volunteers page",
          labels: ["documentation"],
        },
        "git switch -c volunteers-date origin/docs",
        writeFile("docs/volunteers.md", DATED),
        'git commit -am "Date the volunteers page"',
        "git push -u origin volunteers-date",
        pullInto(
          "docs",
          "volunteers-date",
          "Date the volunteers page",
          "Fixes #5",
        ),
        merge(6),
      ],
    },
    { id: "larger" },
  ],
  yourTurn: {
    goal: "File an issue on the Hub for the broken footer link, fix it on a branch named fix-footer, and have the pull request close the issue when it merges into main.",
    world: teamRepoFooter,
    target: closedByPull,
    solution: [
      {
        type: "open-issue",
        repo: TEAM_REPO,
        title: "The footer's menu link is broken",
        labels: ["bug"],
      },
      ...FIX_FOOTER,
      pullInto(
        "main",
        "fix-footer",
        "Fix the footer link",
        `Fixes #${FOOTER_ISSUE}`,
      ),
      merge(4),
    ],
    hints: {
      nudge:
        "Which number does the Hub give your issue, and how can the pull request mention it so that merging also closes it?",
      pointer:
        'A closing keyword followed by the number, such as "Fixes #3", in the description of a pull request into the default branch closes that issue when the pull request merges.',
      reference: "hub-issues",
      next: 'Open the issue (it becomes #3), fix index.html on fix-footer, push it, open a pull request into main whose description says "Fixes #3", then merge it.',
    },
  },
  challenge: {
    goal: "Issue #3 is open and the fix is pushed on fix-footer. Close #3 through a merged pull request.",
    world: teamRepoFixPushed,
    target: closedByPull,
    par: 2,
    solution: [
      pullInto("main", "fix-footer", "Fix the footer link", "Fixes #3"),
      merge(4),
    ],
  },
});
