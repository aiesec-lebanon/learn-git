import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import { recipeSiteForked, recipeSiteTwoByTwo } from "../../worlds/recipe-site";
import { MAIN_HISTORY } from "../b3-1/scene";

const mergedFooter: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    footer: { name: "the footer commit", parents: ["mention"] },
    desserts: { name: "the desserts note on main", parents: ["mention"] },
    merge: {
      name: "the merge commit",
      parents: ["desserts", "footer"],
      message: "Merge branch 'footer'",
    },
  },
  branches: { main: "merge" },
  head: { branch: "main" },
  clean: true,
};

const mergedFeature: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    servings: { name: "the servings note", parents: ["mention"] },
    time: { name: "the cooking time", parents: ["servings"] },
    desserts: { name: "the desserts note", parents: ["mention"] },
    footer: { name: "the footer", parents: ["desserts"] },
    merge: { name: "the merge commit", parents: ["footer", "time"] },
  },
  branches: { main: "merge", feature: null },
  head: { branch: "main" },
  clean: true,
};

export default defineLesson({
  id: "b4-2",
  world: recipeSiteForked,
  beats: [
    { id: "fork", run: ["git log --oneline --graph --all"] },
    { id: "three" },
    { id: "merge", run: ["git merge footer"] },
    { id: "parents", run: ["git show HEAD"] },
    { id: "graph", run: ["git log --oneline --graph", "git branch -d footer"] },
  ],
  yourTurn: {
    goal: "main and footer both moved on, in different files. Merge footer into main.",
    world: recipeSiteForked,
    target: mergedFooter,
    solution: ["git merge footer", "git log --oneline --graph"],
    hints: {
      nudge:
        "Neither branch reaches the other's new commit. Can Git still slide main forward?",
      pointer:
        "git merge combines the merge base and both tips in a new commit with two parents, and main moves onto it.",
      reference: "merge",
      next: "Run git merge footer while HEAD is on main.",
    },
  },
  challenge: {
    goal: "main and feature have two new commits each, in different files. Make main a merge of both, delete feature and end with HEAD on main.",
    world: recipeSiteTwoByTwo,
    target: mergedFeature,
    par: 3,
    solution: ["git switch main", "git merge feature", "git branch -d feature"],
  },
});
