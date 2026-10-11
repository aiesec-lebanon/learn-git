import { defineCapstone } from "../define";
import {
  bakeSaleMessy,
  INDEX,
  INDEX_DRAFT,
  MENU_FIXED,
  README_BAG,
  STYLE,
} from "../worlds/bake-sale";

export default defineCapstone({
  chapter: "b2",
  goal: "Commit the README and menu changes with a .gitignore that hides dist/ and the log. Throw away the broken style.css, and take the index.html draft out of the staging area without losing it.",
  world: bakeSaleMessy,
  target: {
    repo: "bake-sale",
    commits: {
      first: { name: "the first snapshot", parents: [] },
      tidy: {
        name: "the tidy commit",
        parents: ["first"],
        files: {
          "README.md": README_BAG,
          "menu.html": MENU_FIXED,
          "style.css": STYLE,
          "index.html": INDEX,
          ".gitignore": true,
          "build.log": null,
          "dist/menu.min.html": null,
        },
      },
    },
    branches: { main: "tidy" },
    head: { branch: "main" },
    paths: {
      "index.html": "modified",
      "style.css": "unmodified",
      "build.log": "ignored",
      "dist/menu.min.html": "ignored",
    },
    worktree: { "index.html": INDEX_DRAFT, "style.css": STYLE },
  },
  solution: [
    "git restore style.css",
    "git restore --staged index.html",
    'echo "dist/" > .gitignore',
    'echo "*.log" >> .gitignore',
    "git add README.md menu.html .gitignore",
    'git commit -m "Fix the price and ignore build output"',
  ],
  hints: {
    nudge:
      "Which file should leave the staging area, and which one should lose its edits?",
    pointer:
      "git restore --staged unstages and keeps your edits; plain git restore discards them. A .gitignore hides the generated files.",
    reference: "restore",
    next: "Run git restore style.css and git restore --staged index.html, write dist/ and *.log into .gitignore, then git add README.md menu.html .gitignore and commit.",
  },
});
