import type { HubAction, TargetSpec } from "@/engine";
import { defineLesson, writeFile } from "../../define";
import {
  DARK_HEADINGS,
  DARK_STYLE,
  TEAM_REPO,
  teamRepoDarkModeReviewed,
  teamRepoFeaturePushed,
  teamRepoReviewed,
} from "../../worlds/team-repo";

const openPull = (head: string, title: string, body: string): HubAction => ({
  type: "open-pull-request",
  repo: TEAM_REPO,
  base: "main",
  head,
  title,
  body,
});

const OPEN_DARK = openPull(
  "dark-mode",
  "Add a dark theme",
  "A dark theme for evening visitors.",
);
const MERGE: HubAction = {
  type: "merge-pull-request",
  repo: TEAM_REPO,
  number: 1,
};
const DELETE: HubAction = { type: "delete-branch", repo: TEAM_REPO, number: 1 };

/** The pull request merged on origin, pulled into main, and its branch gone everywhere. */
const mergedAndCleaned = (branch: string): TargetSpec => ({
  repo: "bake-sale",
  commits: {
    menu: { name: "Sam's menu commit", message: "Add the menu" },
    tip: {
      name: "your headings commit",
      message: "Colour the headings",
      files: { "style.css": DARK_HEADINGS },
    },
    merge: {
      name: "the pull request's merge commit",
      parents: ["menu", "tip"],
      message: `Merge pull request #1 from sam/${branch}`,
    },
  },
  exact: false,
  branches: { main: "merge", [branch]: null },
  remotes: { origin: { main: "merge", [branch]: null } },
  hub: { origin: { pulls: [{ head: branch, base: "main", state: "merged" }] } },
  head: { branch: "main" },
  clean: true,
});

export default defineLesson({
  id: "b6-2",
  world: teamRepoReviewed,
  beats: [
    {
      id: "push",
      run: [
        "git switch -c dark-mode",
        writeFile("style.css", DARK_STYLE),
        "git add style.css",
        'git commit -m "Add a dark theme"',
        "git push -u origin dark-mode",
      ],
    },
    { id: "open", run: [OPEN_DARK] },
    {
      id: "review",
      run: [
        writeFile("style.css", DARK_HEADINGS),
        'git commit -am "Colour the headings"',
        "git push",
      ],
    },
    { id: "merge", run: [MERGE] },
    {
      id: "cleanup",
      run: [
        DELETE,
        "git switch main",
        "git pull",
        "git branch -d dark-mode",
        "git fetch --prune",
      ],
    },
  ],
  yourTurn: {
    goal: "Open a pull request for dark-mode, address Sam's comment, merge it once he approves, then clean up: delete the branch on the Hub and in your repository, and bring main up to date.",
    world: teamRepoDarkModeReviewed,
    target: mergedAndCleaned("dark-mode"),
    solution: [
      "git push -u origin dark-mode",
      OPEN_DARK,
      writeFile("style.css", DARK_HEADINGS),
      'git commit -am "Colour the headings"',
      "git push",
      MERGE,
      DELETE,
      "git switch main",
      "git pull",
      "git branch -d dark-mode",
    ],
    hints: {
      nudge:
        "Sam reviews on the Hub, not in your repository. What does he need to see there, and what does his comment ask for?",
      pointer:
        "A pull request shows your branch's commits, and every push to the branch adds to it. Once Sam approves, the merge happens on origin, so main needs a pull afterwards.",
      reference: "hub-pull-request",
      next: "Push dark-mode, open a pull request into main, commit and push the headings colour, merge, delete the branch, then git switch main, git pull and git branch -d dark-mode.",
    },
  },
  challenge: {
    goal: "feature is pushed and Sam approves any pull request. Get it merged into main, delete the branch on the Hub and in your repository, and end on an up-to-date main.",
    world: teamRepoFeaturePushed,
    target: mergedAndCleaned("feature"),
    par: 6,
    solution: [
      openPull("feature", "Dark theme", "A dark theme with coloured headings."),
      MERGE,
      DELETE,
      "git switch main",
      "git pull",
      "git branch -d feature",
    ],
    hints: {
      nudge:
        "The branch is on the Hub already. What asks for it to join main there?",
      pointer:
        "A pull request from feature into main gets Sam's approval. Merge it and delete its branch on the Hub, then switch to main, pull, and delete your local feature.",
      reference: "hub-pull-request",
      next: "Open a pull request from feature into main with a description, merge it, delete the branch on the Hub, then run git switch main, git pull and git branch -d feature.",
    },
  },
});
