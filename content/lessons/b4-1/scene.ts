import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  DARK_CSS,
  recipeSiteFeatureAhead,
  recipeSiteMergeReady,
} from "../../worlds/recipe-site";
import { MAIN_HISTORY } from "../b3-1/scene";

const mergedDarkMode: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    dark: {
      name: "the dark stylesheet",
      parents: ["mention"],
      files: { "dark.css": DARK_CSS },
    },
  },
  branches: { main: "dark", "dark-mode": null },
  head: { branch: "main" },
  clean: true,
};

const mergedFeature: TargetSpec = {
  repo: "recipe-site",
  commits: {
    first: { name: "the first snapshot", parents: [] },
    soup: { name: "the soup recipe", parents: ["first"] },
    mention: { name: "the README mention", parents: ["soup"] },
    servings: { name: "the servings note", parents: ["mention"] },
  },
  branches: { main: "servings", feature: null },
  head: { branch: "main" },
  clean: true,
};

export default defineLesson({
  id: "b4-1",
  world: recipeSiteMergeReady,
  beats: [
    { id: "behind", run: ["git log --oneline --graph --all"] },
    { id: "predict" },
    { id: "glide", run: ["git merge dark-mode"] },
    {
      id: "no-ff",
      run: [
        "git switch -c footer",
        'echo "<footer>Made with care.</footer>" >> index.html',
        'git commit -am "Add a footer"',
        "git switch main",
        "git merge --no-ff footer",
      ],
    },
    { id: "tidy", run: ["git branch -d dark-mode footer"] },
  ],
  yourTurn: {
    goal: "dark-mode is finished. Bring it into main, then delete the branch.",
    world: recipeSiteMergeReady,
    target: mergedDarkMode,
    solution: ["git merge dark-mode", "git branch -d dark-mode"],
    hints: {
      nudge:
        "main has nothing dark-mode lacks. What does Git need to change to bring it in?",
      pointer:
        "git merge brings another branch into the one HEAD is on. When that branch is ahead on the same line, Git slides the label forward. git branch -d then removes the merged label.",
      next: "Run git merge dark-mode, then git branch -d dark-mode.",
    },
  },
  challenge: {
    goal: "feature is two commits ahead of main on the same line. Bring them into main, delete feature and end with HEAD on main.",
    world: recipeSiteFeatureAhead,
    target: mergedFeature,
    par: 3,
    solution: ["git switch main", "git merge feature", "git branch -d feature"],
  },
});
