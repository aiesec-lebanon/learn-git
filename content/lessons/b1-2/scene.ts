import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import { recipeSiteCommitted } from "../../worlds/recipe-site";
import {
  APP_JS,
  README_FIXED,
  README_TYPO,
  typoAndFeature,
} from "../../worlds/typo-and-feature";

const typoFixOnly: TargetSpec = {
  repo: "recipe-site",
  commits: {
    first: {
      name: "the first snapshot",
      parents: [],
      files: { "README.md": README_TYPO, "app.js": APP_JS },
    },
    fix: {
      name: "the typo fix",
      parents: ["first"],
      files: { "README.md": README_FIXED, "app.js": APP_JS, "notes.txt": null },
    },
  },
  branches: { main: "fix" },
  head: { branch: "main" },
  paths: {
    "README.md": "unmodified",
    "app.js": "modified",
    "notes.txt": "untracked",
  },
};

export default defineLesson({
  id: "b1-2",
  world: recipeSiteCommitted,
  beats: [
    { id: "zones" },
    {
      id: "modified",
      run: ['echo "Soups, salads and desserts." >> README.md', "git status"],
    },
    { id: "add", run: ["git add README.md"] },
    {
      id: "both",
      run: ['echo "New recipes every Friday." >> README.md', "git status"],
    },
    { id: "commit", run: ['git commit -m "Describe the menu"'] },
    {
      id: "untracked",
      run: ['echo "Ideas: a search box." > notes.txt', "git status"],
    },
  ],
  yourTurn: {
    goal: "You fixed a typo in README.md and started a feature in app.js. Commit only the typo fix.",
    world: typoAndFeature,
    target: typoFixOnly,
    solution: ["git add README.md", 'git commit -m "Fix typo"'],
    hints: {
      nudge: "Which of your changes belongs in the next commit?",
      pointer:
        "git commit records only what is in the staging area, and git add stages the files you name.",
      reference: "add",
      next: 'Run git add README.md to stage the typo fix alone, then git commit -m "Fix typo". app.js stays modified for later.',
    },
  },
  challenge: {
    goal: "Record a commit with only the README.md change; app.js stays modified and notes.txt untracked.",
    world: typoAndFeature,
    target: typoFixOnly,
    par: 2,
    solution: ["git add README.md", 'git commit -m "Fix typo"'],
  },
});
