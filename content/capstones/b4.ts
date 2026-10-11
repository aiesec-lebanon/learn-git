import { defineCapstone, writeFile } from "../define";
import {
  bakeSaleThreeBranches,
  INDEX_LATER,
  MENU_AGREED,
  README_BAG,
} from "../worlds/bake-sale";

export default defineCapstone({
  chapter: "b4",
  goal: "Merge bags, then hours, then pricing into main. hours and pricing disagree on the lemon cake price: settle on $4.50. End with HEAD on main.",
  world: bakeSaleThreeBranches,
  target: {
    repo: "bake-sale",
    commits: {
      first: { name: "the first snapshot", parents: [] },
      bags: { name: "the bags note", parents: ["first"] },
      hours: { name: "the hours change", parents: ["first"] },
      pricing: { name: "the price rise", parents: ["first"] },
      withHours: {
        name: "the merge of hours",
        parents: ["bags", "hours"],
        message: "Merge branch 'hours'",
      },
      withPricing: {
        name: "the merge of pricing",
        parents: ["withHours", "pricing"],
        message: "Merge branch 'pricing'",
        files: {
          "README.md": README_BAG,
          "index.html": INDEX_LATER,
          "menu.html": MENU_AGREED,
        },
      },
    },
    branches: { main: "withPricing" },
    head: { branch: "main" },
    clean: true,
  },
  solution: [
    "git merge bags",
    "git merge hours",
    "git merge pricing",
    writeFile("menu.html", MENU_AGREED),
    "git add menu.html",
    `git commit -m "Merge branch 'pricing'"`,
  ],
  hints: {
    nudge:
      "Which of the three branches is ahead of main on the same line, and which ones moved on separately?",
    pointer:
      "bags fast-forwards and hours needs a merge commit. pricing then conflicts in menu.html: edit it, git add it and git commit to finish.",
    reference: "merge",
    next: "Run git merge bags, git merge hours and git merge pricing. Set the price line in menu.html to $4.50 without markers, then git add menu.html and git commit -m \"Merge branch 'pricing'\".",
  },
});
