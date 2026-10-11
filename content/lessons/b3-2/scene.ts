import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  recipeSiteDarkMode,
  recipeSiteHistory,
} from "../../worlds/recipe-site";
import { MAIN_HISTORY } from "../b3-1/scene";

const forked: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    dark: {
      name: "the dark stylesheet",
      parents: ["mention"],
      files: { "dark.css": true },
    },
    fix: {
      name: "the fix on main",
      parents: ["mention"],
      files: { "dark.css": null },
    },
  },
  branches: { main: "fix", "dark-mode": "dark" },
  head: { branch: "main" },
  clean: true,
};

const diverged: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    topic1: { name: "the first topic commit", parents: ["mention"] },
    topic2: { name: "the second topic commit", parents: ["topic1"] },
    fix: { name: "the new commit on main", parents: ["mention"] },
  },
  branches: { main: "fix", topic: "topic2" },
  head: { branch: "main" },
  clean: true,
};

const FIX = 'echo "<p>Fresh recipes every week.</p>" >> index.html';

export default defineLesson({
  id: "b3-2",
  world: recipeSiteHistory,
  beats: [
    {
      id: "fork",
      run: [
        "git switch -c dark-mode",
        'echo "body { background: #222; color: #eee; }" > dark.css',
        "git add dark.css",
        'git commit -m "Add a dark stylesheet"',
        "git switch main",
        FIX,
        'git commit -am "Promise fresh recipes"',
      ],
    },
    { id: "contains" },
    { id: "text", run: ["git log --oneline --graph --all"] },
    { id: "rename", run: ["git branch -m dark-mode night-mode"] },
    { id: "delete", run: ["git branch -D night-mode"] },
  ],
  yourTurn: {
    goal: "dark-mode is still in progress. Fix the intro on main with one commit, then read both lines of work with git log --oneline --graph --all.",
    world: recipeSiteDarkMode,
    target: forked,
    solution: [
      "git switch main",
      FIX,
      'git commit -am "Promise fresh recipes"',
      "git log --oneline --graph --all",
    ],
    hints: {
      nudge:
        "Which branch is HEAD on right now, and which one should get the fix?",
      pointer:
        "A commit moves the branch HEAD is on, so switch to main first. git log --oneline --graph --all then draws both lines of work.",
      reference: "branch",
      next: 'Run git switch main, add a line to index.html with echo, git commit -am "Promise fresh recipes", then git log --oneline --graph --all.',
    },
  },
  challenge: {
    goal: "Two commits on a new topic branch that starts at main, one new commit on main, and HEAD back on main.",
    world: recipeSiteHistory,
    target: diverged,
    par: 5,
    solution: [
      "git switch -c topic",
      'echo "Serves four." >> README.md',
      'git commit -am "Note the servings"',
      'echo "Takes an hour." >> README.md',
      'git commit -am "Note the time"',
      "git switch main",
      FIX,
      'git commit -am "Promise fresh recipes"',
    ],
  },
});
