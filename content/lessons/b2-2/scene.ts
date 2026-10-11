import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  bakeSaleHistory,
  bakeSaleUndo,
  INDEX_LATER,
  STYLE,
} from "../../worlds/bake-sale";

const backToGood: TargetSpec = {
  repo: "bake-sale",
  commits: { first: { name: "the first snapshot", parents: [] } },
  branches: { main: "first" },
  head: { branch: "main" },
  paths: {
    "index.html": "modified",
    "style.css": "unmodified",
    "debug.log": "untracked",
  },
  worktree: { "index.html": INDEX_LATER, "style.css": STYLE },
};

const solution = ["git restore style.css", "git restore --staged debug.log"];

export default defineLesson({
  id: "b2-2",
  world: bakeSaleHistory,
  beats: [
    {
      id: "directions",
      run: ['echo "Bring your own bag." >> README.md', "git add README.md"],
    },
    { id: "unstage", run: ["git restore --staged README.md", "git status -s"] },
    { id: "discard", run: ["git restore README.md", "git status -s"] },
    {
      id: "source",
      run: ["git restore --source=HEAD~1 menu.html", "git status -s"],
    },
    { id: "older", run: ["git checkout -- menu.html", "git status -s"] },
  ],
  yourTurn: {
    goal: "You broke style.css while experimenting and staged debug.log by accident. Get back to clean without losing the good change in index.html.",
    world: bakeSaleUndo,
    target: backToGood,
    solution: ["git status", ...solution],
    hints: {
      nudge:
        "Which change do you want to throw away, and which file only needs to leave the staging area?",
      pointer:
        "git restore copies the staged version over your file. With --staged it only takes a file out of the draft and keeps your copy.",
      reference: "restore",
      next: "Run git restore style.css to discard the broken edit, then git restore --staged debug.log to unstage the log.",
    },
  },
  challenge: {
    goal: "Keep the index.html change, discard style.css, and unstage debug.log, with nothing left staged.",
    world: bakeSaleUndo,
    target: backToGood,
    par: 2,
    solution,
  },
});
