import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  bakeSaleHistory,
  bakeSaleThreeChanges,
  INDEX,
  MENU,
  MENU_FIXED,
  README,
  README_V2,
  README_V3,
  readmeThreeVersions,
} from "../../worlds/bake-sale";

const priceFixOnly: TargetSpec = {
  repo: "bake-sale",
  commits: {
    first: {
      name: "the first snapshot",
      parents: [],
      files: { "menu.html": MENU },
    },
    fix: {
      name: "the price fix",
      parents: ["first"],
      files: {
        "menu.html": MENU_FIXED,
        "README.md": README,
        "index.html": INDEX,
      },
    },
  },
  branches: { main: "fix" },
  head: { branch: "main" },
  paths: {
    "menu.html": "unmodified",
    "README.md": "modified",
    "index.html": "modified",
  },
};

const twoVersions: TargetSpec = {
  repo: "bake-sale",
  commits: {
    first: {
      name: "the first snapshot",
      parents: [],
      files: { "README.md": README },
    },
    v2: {
      name: "the staged version",
      parents: ["first"],
      files: { "README.md": README_V2 },
    },
    v3: {
      name: "your latest version",
      parents: ["v2"],
      files: { "README.md": README_V3 },
    },
  },
  branches: { main: "v3" },
  head: { branch: "main" },
  clean: true,
};

export default defineLesson({
  id: "b2-1",
  world: bakeSaleHistory,
  beats: [
    {
      id: "anatomy",
      run: ['echo "Bring your own bag." >> README.md', "git diff"],
    },
    { id: "lens" },
    {
      id: "staged",
      run: ["git add README.md", "git diff", "git diff --staged"],
    },
    { id: "commits", run: ["git diff HEAD~1 HEAD", "git show --stat"] },
  ],
  yourTurn: {
    goal: "Three files changed. One of them fixes the lemon cake price from $4 to $3. Find it with git diff, then commit only that file.",
    world: bakeSaleThreeChanges,
    target: priceFixOnly,
    solution: [
      "git diff",
      "git add menu.html",
      'git commit -m "Fix the lemon cake price"',
    ],
    hints: {
      nudge: "Which file has a line starting with - that mentions $4?",
      pointer:
        "git diff lists every change you have not staged, file by file. Stage only the file that holds the price.",
      reference: "diff",
      next: 'Run git diff and find the menu.html section, then git add menu.html and git commit -m "Fix the lemon cake price".',
    },
  },
  challenge: {
    goal: "README.md has three versions: committed, staged and in your files. Record the staged one, then yours, as two commits.",
    world: readmeThreeVersions,
    target: twoVersions,
    par: 3,
    solution: [
      'git commit -m "Take cash"',
      "git add README.md",
      'git commit -m "Take cards too"',
    ],
  },
});
