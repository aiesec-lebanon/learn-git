import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  recipeSiteDarkMode,
  recipeSiteHistory,
} from "../../worlds/recipe-site";

export const RECIPES_URL = "https://hub.test/you/recipes.git";
const DRAFT_URL = "https://hub.test/you/recipes-draft.git";

const withHub = { ...recipeSiteHistory, hub: {} };

const createRecipes = { type: "create-repository", name: "recipes" } as const;

const published = (head: string): TargetSpec => ({
  commits: {
    tip: {
      name: "your README commit",
      message: "Mention the soup in the README",
    },
  },
  exact: false,
  branches: { main: "tip" },
  remotes: { origin: { main: "tip" } },
  head: { branch: head },
  config: {
    "branch.main.remote": "origin",
    "branch.main.merge": "refs/heads/main",
  },
});

export default defineLesson({
  id: "b6-1",
  world: withHub,
  beats: [
    {
      id: "readme-trap",
      run: [
        { type: "create-repository", name: "recipes-draft", readme: true },
        `git remote add draft ${DRAFT_URL}`,
        "git push -u draft main",
        "git pull --no-rebase draft main",
      ],
      refusals: ["git push -u draft main", "git pull --no-rebase draft main"],
    },
    {
      id: "empty",
      run: [
        createRecipes,
        `git remote add origin ${RECIPES_URL}`,
        "git push -u origin main",
      ],
    },
    { id: "page", run: ["git branch -vv", "git log --oneline origin/main"] },
    { id: "credentials" },
  ],
  yourTurn: {
    goal: "Create an empty repository named recipes on the Hub, connect it as origin and push main so it tracks origin/main.",
    world: withHub,
    target: published("main"),
    solution: [
      createRecipes,
      `git remote add origin ${RECIPES_URL}`,
      "git push -u origin main",
    ],
    hints: {
      nudge:
        "Your three commits exist only on this machine. Where should they go, and what does your repository call that place?",
      pointer:
        "Create the repository on the Hub without a README, then git remote add gives its address a short name, and git push -u sends main and links it.",
      reference: "remote",
      next: `Create recipes in the Hub, then run git remote add origin ${RECIPES_URL} and git push -u origin main.`,
    },
  },
  challenge: {
    goal: "You are on dark-mode. Publish main, and only main, to a new empty recipes repository on the Hub, with main tracking origin/main. Stay on dark-mode.",
    world: { ...recipeSiteDarkMode, hub: {} },
    target: {
      ...published("dark-mode"),
      branches: { main: "tip", "dark-mode": "dark" },
      remotes: { origin: { main: "tip", "dark-mode": null } },
      commits: {
        tip: {
          name: "your README commit",
          message: "Mention the soup in the README",
        },
        dark: { name: "your dark theme commit", parents: ["tip"] },
      },
    },
    par: 3,
    solution: [
      createRecipes,
      `git remote add origin ${RECIPES_URL}`,
      "git push -u origin main",
    ],
    hints: {
      nudge:
        "Where will main go, and what name will your repository use for it?",
      pointer:
        "Create the empty repository on the Hub, add its address as origin with git remote add, then push main with -u. Pushing one branch by name leaves the others at home.",
      reference: "remote",
      next: "Create the recipes repository on the Hub, run git remote add origin https://hub.test/you/recipes.git, then git push -u origin main.",
    },
  },
});
