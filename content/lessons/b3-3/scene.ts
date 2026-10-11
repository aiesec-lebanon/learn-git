import type { TargetSpec } from "@/engine";
import { defineLesson } from "../../define";
import {
  recipeSiteDetached,
  recipeSiteHistory,
} from "../../worlds/recipe-site";
import { MAIN_HISTORY } from "../b3-1/scene";

const TRY = 'echo "Now with a photo of every dish." >> README.md';

const experimentOnFirst: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    experiment: { name: "the experiment", parents: ["first"] },
  },
  branches: { main: "mention", experiment: "experiment" },
  head: { branch: "main" },
  clean: true,
};

const savedExperiment: TargetSpec = {
  repo: "recipe-site",
  commits: {
    ...MAIN_HISTORY,
    experiment: { name: "the commit made while detached", parents: ["soup"] },
  },
  branches: { main: "mention", experiment: "experiment" },
  head: { branch: "main" },
  clean: true,
};

export default defineLesson({
  id: "b3-3",
  world: recipeSiteHistory,
  beats: [
    { id: "refuse", run: ["git log --oneline"] },
    { id: "detach", run: ["git switch --detach HEAD~2", "git status"] },
    {
      id: "commit",
      run: [TRY, 'git commit -am "Try photos"', "git status"],
    },
    { id: "leave", run: ["git switch main"] },
    { id: "rescue", run: ["git switch -c experiment -"] },
    { id: "back", run: ["git switch -"] },
  ],
  yourTurn: {
    goal: "Visit the first snapshot, two commits back. Try an experiment there in one commit, keep it on a branch named experiment, then go back to main.",
    world: recipeSiteHistory,
    target: experimentOnFirst,
    solution: [
      "git switch --detach HEAD~2",
      TRY,
      'git commit -am "Try photos"',
      "git switch -c experiment",
      "git switch main",
    ],
    hints: {
      nudge: "How can HEAD sit on a commit that no branch points at?",
      pointer:
        "git switch --detach visits an old commit. A commit made there has no label, so give it one with git switch -c before you leave.",
      reference: "switch",
      next: 'Run git switch --detach HEAD~2, add a line to README.md with echo, git commit -am "Try photos", then git switch -c experiment and git switch main.',
    },
  },
  challenge: {
    goal: "HEAD is detached with an experiment on top of the soup commit. Keep the experiment on a branch named experiment and end with HEAD on main.",
    world: recipeSiteDetached,
    target: savedExperiment,
    par: 2,
    solution: ["git switch -c experiment", "git switch main"],
    hints: {
      nudge:
        "HEAD points straight at the experiment. What keeps that commit reachable once HEAD moves?",
      pointer:
        "A branch is a name for a commit. git switch -c makes one where HEAD is now and puts HEAD on it.",
      reference: "switch",
      next: "Run git switch -c experiment to name the commit, then git switch main.",
    },
  },
});
