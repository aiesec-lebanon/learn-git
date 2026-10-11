import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import { recipeSiteHistory } from "../../worlds/recipe-site";

/** The three commits every B3 target starts from: main's history, untouched. */
export const MAIN_HISTORY = {
  first: { name: "the first snapshot", parents: [] },
  soup: { name: "the soup recipe", parents: ["first"] },
  mention: { name: "the README mention", parents: ["soup"] },
} as const;

const darkMode: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    dark: { name: "the commit on dark-mode", parents: ["mention"] },
  },
  branches: { main: "mention", "dark-mode": "dark" },
  head: { branch: "main" },
  clean: true,
};

const feature: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    feature: { name: "the commit on feature", parents: ["soup"] },
  },
  branches: { main: "mention", feature: "feature" },
  head: { branch: "main" },
  clean: true,
};

export default defineLesson({
  id: "b3-1",
  world: recipeSiteHistory,
  beats: [
    { id: "label", run: ["git branch dark-mode", "git branch"] },
    { id: "switch", run: ["git switch dark-mode"] },
    {
      id: "move",
      run: [
        'echo "body { background: #222; color: #eee; }" > dark.css',
        "git add dark.css",
        'git commit -m "Add a dark stylesheet"',
      ],
    },
    { id: "back", run: ["git switch main"] },
    { id: "create", run: ["git switch -c footer"] },
    {
      id: "carry",
      run: ['echo "Made with care." >> README.md', "git switch main"],
    },
  ],
  yourTurn: {
    goal: "Start a dark-mode branch, make one commit on it, then switch back to main and check that main didn't move.",
    world: recipeSiteHistory,
    target: darkMode,
    solution: [
      "git switch -c dark-mode",
      'echo "body { background: #222; color: #eee; }" > dark.css',
      "git add dark.css",
      'git commit -m "Add a dark stylesheet"',
      "git switch main",
      "git log --oneline --all",
    ],
    hints: {
      nudge: "Which branch does a commit move: main, or the one HEAD is on?",
      pointer:
        "git switch -c makes a branch and puts HEAD on it in one step. A commit then moves only that branch, and git switch main takes HEAD back.",
      reference: "switch",
      next: 'Run git switch -c dark-mode, write dark.css with echo, git add dark.css, git commit -m "Add a dark stylesheet", then git switch main.',
    },
  },
  challenge: {
    goal: "A feature branch that starts from the soup recipe commit (one before main) with one new commit on it, HEAD back on main and main unchanged.",
    world: recipeSiteHistory,
    target: feature,
    par: 3,
    solution: [
      "git switch -c feature HEAD~1",
      'echo "Serves four." >> README.md',
      'git commit -am "Note the servings"',
      "git switch main",
    ],
    hints: {
      nudge:
        "Where should the new branch start: at main, or one commit before it?",
      pointer:
        "git switch -c takes a starting point, and HEAD~1 names the commit before HEAD. Edits are free, and git commit -am records them.",
      reference: "switch",
      next: 'Run git switch -c feature HEAD~1, add a line to README.md, git commit -am "Note the servings", then git switch main.',
    },
  },
});
