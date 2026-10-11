import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  samPushesMeeting,
  TEAM_URL,
  teamRepoBeforeClone,
} from "../../worlds/team-repo";

const CLONE = `git clone ${TEAM_URL}`;

const onDocs: TargetSpec = {
  repo: "bake-sale",
  branches: { docs: "volunteers" },
  commits: {
    volunteers: {
      name: "Sam's volunteers list",
      message: "List the volunteers",
    },
  },
  exact: false,
  head: { branch: "docs" },
  config: {
    "branch.docs.remote": "origin",
    "branch.docs.merge": "refs/heads/docs",
  },
  clean: true,
};

export default defineLesson({
  id: "b5-1",
  world: {
    ...teamRepoBeforeClone,
    actors: [
      {
        ...samPushesMeeting({ kind: "after-command", pattern: "^git status$" }),
        when: "after your first git status",
      },
    ],
  },
  beats: [
    { id: "clone", run: [CLONE, "cd bake-sale"] },
    { id: "origin", run: ["git remote -v", "git branch -vv"] },
    { id: "last-contact", run: ["git status", "git status"] },
    { id: "all", run: ["git branch -a"] },
    { id: "docs", run: ["git switch docs", "git branch -vv"] },
  ],
  yourTurn: {
    goal: "Clone the team repository from https://hub.test/sam/bake-sale.git and start working on docs, a branch that so far exists only on origin.",
    world: teamRepoBeforeClone,
    target: onDocs,
    solution: [CLONE, "cd bake-sale", "git switch docs"],
    hints: {
      nudge:
        "After cloning, which branches do you have of your own, and which ones are only origin's?",
      pointer:
        "git clone copies every commit and gives you origin/* labels. Switching to a name that exists only as origin/docs creates a local docs that tracks it.",
      reference: "clone",
      next: `Run ${CLONE}, then cd bake-sale and git switch docs.`,
    },
  },
  challenge: {
    goal: "No local repository yet. End inside a clone of the team repository with HEAD on a local docs that tracks origin/docs.",
    world: teamRepoBeforeClone,
    target: onDocs,
    par: 2,
    solution: [CLONE, "cd bake-sale", "git switch docs"],
  },
});
