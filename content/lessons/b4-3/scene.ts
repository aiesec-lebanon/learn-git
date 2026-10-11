import type { TargetSpec } from "@/engine";
import { defineLesson, writeFile } from "../../define";
import {
  bakeSalePriceClash,
  INDEX_LATER,
  MENU_AGREED,
  MENU_YOURS,
} from "../../worlds/bake-sale";

const MERGE_MESSAGE = "Merge branch 'pricing'";
const COMMIT = `git commit -m "${MERGE_MESSAGE}"`;

const mergedWith = (menu: string): TargetSpec => ({
  repo: "bake-sale",
  commits: {
    first: { name: "the first snapshot", parents: [] },
    sam: { name: "Sam's pricing commit", parents: ["first"] },
    yours: { name: "your price change", parents: ["first"] },
    merge: {
      name: "the merge commit",
      parents: ["yours", "sam"],
      message: MERGE_MESSAGE,
      files: { "menu.html": menu, "index.html": INDEX_LATER },
    },
  },
  branches: { main: "merge" },
  head: { branch: "main" },
  clean: true,
});

export default defineLesson({
  id: "b4-3",
  world: bakeSalePriceClash,
  beats: [
    { id: "clash", run: ["git log --oneline --graph --all"] },
    { id: "stop", run: ["git merge pricing", "git status"] },
    { id: "markers", run: ["cat menu.html"] },
    { id: "abort", run: ["git merge --abort", "git status"] },
    {
      id: "resolve",
      run: [
        "git merge pricing",
        writeFile("menu.html", MENU_AGREED),
        "git add menu.html",
        COMMIT,
      ],
    },
    { id: "zdiff3", run: ["git config merge.conflictStyle zdiff3"] },
  ],
  yourTurn: {
    goal: "You lowered the lemon cake price; Sam raised it on pricing. Merge pricing into main and settle on $4.50.",
    world: bakeSalePriceClash,
    target: mergedWith(MENU_AGREED),
    solution: [
      "git merge pricing",
      writeFile("menu.html", MENU_AGREED),
      "git add menu.html",
      COMMIT,
    ],
    hints: {
      nudge:
        "Both branches changed the same line. Who decides which price wins?",
      pointer:
        "A conflicted merge pauses. Edit the file so it reads the way you want, without markers, mark it resolved with git add, then git commit finishes the merge.",
      reference: "merge",
      next: "Run git merge pricing, change the price line in menu.html to $4.50 and remove the markers, then git add menu.html and git commit.",
    },
  },
  challenge: {
    goal: "Merge pricing into main, keeping your $3 price and Sam's longer opening hours.",
    world: bakeSalePriceClash,
    target: mergedWith(MENU_YOURS),
    par: 3,
    solution: [
      "git merge pricing",
      writeFile("menu.html", MENU_YOURS),
      "git add menu.html",
      COMMIT,
    ],
    hints: {
      nudge:
        "Which parts of menu.html are yours and which are Sam's after the merge stops?",
      pointer:
        "A conflicted merge waits for you. Edit the file to the result you want (edits are free), stage it with git add, and git commit finishes the merge.",
      reference: "merge",
      next: "Run git merge pricing, edit menu.html to keep your $3 price and Sam's longer hours, then git add menu.html and git commit.",
    },
  },
});
