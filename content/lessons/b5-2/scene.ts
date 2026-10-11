import type { TargetSpec } from "@/engine";
import { defineLesson, writeFile } from "../../define";
import { INDEX_LATER } from "../../worlds/bake-sale";
import {
  samAsksForBags,
  samPushesMeeting,
  samRaisesPrice,
  teamRepo,
  teamRepoDiverged,
} from "../../worlds/team-repo";

/** main merged your hours commit with Sam's meeting commit. */
export const caughtUp: TargetSpec = {
  repo: "bake-sale",
  commits: {
    first: { name: "the first snapshot", parents: [] },
    menu: { name: "the menu commit", parents: ["first"] },
    volunteers: { name: "Sam's volunteers list", parents: ["menu"] },
    meeting: {
      name: "Sam's meeting commit",
      parents: ["menu"],
      message: "Add the team meeting",
    },
    hours: {
      name: "your hours commit",
      parents: ["menu"],
      message: "Open until 15:00",
    },
    merge: {
      name: "the merge commit",
      parents: ["hours", "meeting"],
      files: { "index.html": INDEX_LATER },
    },
  },
  branches: { main: "merge" },
  head: { branch: "main" },
  clean: true,
};

export default defineLesson({
  id: "b5-2",
  world: {
    ...teamRepo,
    actors: [
      {
        ...samPushesMeeting({ kind: "after-command", pattern: "^git status$" }),
        when: "after your first git status",
      },
      {
        ...samRaisesPrice({
          kind: "after-command",
          pattern: "^git status -sb$",
        }),
        when: "after git status -sb",
      },
      {
        ...samAsksForBags({ kind: "after-command", pattern: "^git commit" }),
        when: "after your commit",
      },
    ],
  },
  beats: [
    { id: "fetch", run: ["git status", "git fetch", "git status"] },
    { id: "merge", run: ["git merge origin/main"] },
    { id: "pull", run: ["git status -sb", "git pull"] },
    {
      id: "diverged",
      run: [
        writeFile("index.html", INDEX_LATER),
        'git commit -am "Open until 15:00"',
        "git pull",
        "git pull --no-rebase",
        "git config pull.rebase false",
      ],
      refusals: ["git pull"],
    },
    { id: "conflict" },
  ],
  yourTurn: {
    goal: "Sam pushed while you were working on the opening hours. Catch up with origin's main without losing your own commit, by merging.",
    world: teamRepoDiverged,
    target: caughtUp,
    solution: ["git fetch", "git merge origin/main"],
    hints: {
      nudge:
        "Your origin/main is a bookmark from before Sam pushed. What brings it up to date?",
      pointer:
        "git fetch moves origin/main to Sam's commit without touching your files. Merging origin/main then combines both commits; git pull --no-rebase does both steps at once.",
      reference: "fetch",
      next: "Run git fetch, then git merge origin/main.",
    },
  },
  challenge: {
    goal: "main is one commit ahead of origin and one behind, not yet fetched. Make main a merge of both.",
    world: teamRepoDiverged,
    target: caughtUp,
    par: 2,
    solution: ["git fetch", "git merge origin/main"],
    hints: {
      nudge:
        "Your repository does not know about origin's new commit yet. What brings it in without changing your branch?",
      pointer:
        "git fetch updates origin/main. git merge origin/main then joins it with your commit. git pull does both, once you say how to reconcile.",
      reference: "fetch",
      next: "Run git fetch, then git merge origin/main.",
    },
    underPar: [
      {
        solution: ["git pull --no-rebase"],
        why: "git pull is a fetch followed by a merge. With branches that diverged it needs to know how to join them, and --no-rebase says merge, so one command does both steps.",
      },
    ],
  },
});
