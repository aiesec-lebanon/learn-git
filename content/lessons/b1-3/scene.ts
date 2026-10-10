import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  recipeSiteDessert,
  recipeSiteFiles,
  recipeSiteHistory,
} from "../../worlds/recipe-site";

const README = recipeSiteFiles["recipe-site/README.md"];

const twoCommits: TargetSpec = {
  repo: "recipe-site",
  commits: {
    first: { name: "the first snapshot", parents: [] },
    dessert: {
      name: "the dessert page",
      parents: ["first"],
      files: { "dessert.html": true, "README.md": README },
    },
    link: {
      name: "the README link",
      parents: ["dessert"],
      files: {
        "dessert.html": true,
        "README.md": `${README}Desserts: see dessert.html.\n`,
      },
    },
  },
  branches: { main: "link" },
  head: { branch: "main" },
  clean: true,
};

const record = [
  "git add dessert.html",
  'git commit -m "Add the dessert page"',
  "git add README.md",
  'git commit -m "Link the dessert page"',
];

export default defineLesson({
  id: "b1-3",
  world: recipeSiteHistory,
  beats: [
    { id: "chain" },
    { id: "log", run: ["git log"] },
    { id: "graph", run: ["git log --oneline --graph"] },
    { id: "show", run: ["git show"] },
    { id: "what-if" },
  ],
  yourTurn: {
    goal: "Record the dessert page and the README link as two separate commits, then check them with git log and git show.",
    world: recipeSiteDessert,
    target: twoCommits,
    solution: [...record, "git log --oneline", "git show"],
    hints: {
      nudge: "Which file should the first of the two commits contain?",
      pointer:
        "Each commit records what is in the staging area, so stage one file, commit, then stage the other.",
      reference: "add",
      next: 'Run git add dessert.html and git commit -m "Add the dessert page", then git add README.md and git commit -m "Link the dessert page". git log --oneline shows both.',
    },
  },
  challenge: {
    goal: "Two new commits: the first adds only dessert.html, the second holds the README change.",
    world: recipeSiteDessert,
    target: twoCommits,
    par: 4,
    solution: record,
  },
});
