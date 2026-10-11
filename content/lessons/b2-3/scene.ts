import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import { bakeSaleSecrets, ENV } from "../../worlds/bake-sale";

const ignoredAndUntracked: TargetSpec = {
  repo: "bake-sale",
  commits: {
    first: {
      name: "the first snapshot",
      parents: [],
      files: { ".env": ENV },
    },
    ignore: {
      name: "the commit that adds .gitignore",
      parents: ["first"],
      files: { ".gitignore": true, ".env": null },
    },
  },
  branches: { main: "ignore" },
  head: { branch: "main" },
  clean: true,
  worktree: { ".env": ENV, "app.log": true, "dist/menu.min.html": true },
};

const writeIgnore = [
  'echo ".env" > .gitignore',
  'echo "dist/" >> .gitignore',
  'echo "*.log" >> .gitignore',
];

const solution = [
  ...writeIgnore,
  "git rm --cached .env",
  "git add .gitignore",
  'git commit -m "Ignore secrets and build output"',
];

export default defineLesson({
  id: "b2-3",
  world: bakeSaleSecrets,
  beats: [
    {
      id: "states",
      run: ['echo "Bring your own bag." >> README.md', "git status"],
    },
    {
      id: "patterns",
      run: [
        'echo "*.log" > .gitignore',
        'echo "dist/" >> .gitignore',
        "git status --ignored",
      ],
    },
    {
      id: "trap",
      run: [
        'echo ".env" >> .gitignore',
        "git status -s",
        "git rm --cached .env",
        "git status -s",
      ],
    },
    {
      id: "rename",
      run: ["mv menu.html prices.html", "git add -A", "git status"],
    },
  ],
  yourTurn: {
    goal: "Ignore the build output in dist/ and every .log file, and stop tracking .env while keeping your local copy. Record it all in one commit.",
    world: bakeSaleSecrets,
    target: ignoredAndUntracked,
    solution,
    hints: {
      nudge: "Which of the three files does Git already track?",
      pointer:
        ".gitignore only hides untracked files. A tracked file needs git rm --cached to leave the staging area while it stays on disk.",
      reference: "status",
      next: 'Write .env, dist/ and *.log into .gitignore with echo, run git rm --cached .env, then git add .gitignore and git commit -m "Ignore secrets and build output".',
    },
  },
  challenge: {
    goal: "One commit that adds a .gitignore covering .env, dist/ and app.log and stops tracking .env, with .env still on disk and a clean status.",
    world: bakeSaleSecrets,
    target: ignoredAndUntracked,
    par: 3,
    solution,
  },
});
