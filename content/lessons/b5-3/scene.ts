import type { TargetSpec } from "@/engine";
import { defineLesson, writeFile } from "../../define";
import { INDEX_LATER } from "../../worlds/bake-sale";
import {
  DARK_HEADINGS,
  DARK_STYLE,
  samPushesMeeting,
  teamRepo,
  teamRepoDarkMode,
  teamRepoFeature,
} from "../../worlds/team-repo";

const tracks = (branch: string) => ({
  [`branch.${branch}.remote`]: "origin",
  [`branch.${branch}.merge`]: `refs/heads/${branch}`,
});

const published: TargetSpec = {
  repo: "bake-sale",
  commits: {
    dark: { name: "your dark theme commit", message: "Add a dark theme" },
  },
  exact: false,
  branches: { "dark-mode": "dark" },
  remotes: { origin: { "dark-mode": "dark" } },
  head: { branch: "dark-mode" },
  config: tracks("dark-mode"),
  clean: true,
};

const featurePublished: TargetSpec = {
  repo: "bake-sale",
  commits: {
    meeting: { name: "Sam's meeting commit", message: "Add the team meeting" },
    headings: {
      name: "your headings commit",
      message: "Colour the headings",
      parents: ["dark"],
    },
    dark: { name: "your dark theme commit", message: "Add a dark theme" },
  },
  exact: false,
  branches: { main: "meeting", feature: "headings" },
  remotes: { origin: { main: "meeting", feature: "headings" } },
  head: { branch: "main" },
  config: tracks("feature"),
  clean: true,
};

export default defineLesson({
  id: "b5-3",
  world: {
    ...teamRepo,
    actors: [
      {
        ...samPushesMeeting({
          kind: "after-command",
          pattern: "^git switch main$",
        }),
        when: "while you switch back to main",
      },
    ],
  },
  beats: [
    {
      id: "no-upstream",
      run: [
        "git switch -c dark-mode",
        writeFile("style.css", DARK_STYLE),
        "git add style.css",
        'git commit -m "Add a dark theme"',
        "git push",
      ],
      refusals: ["git push"],
    },
    { id: "publish", run: ["git push -u origin dark-mode", "git branch -vv"] },
    {
      id: "ahead",
      run: [
        writeFile("style.css", DARK_HEADINGS),
        'git commit -am "Colour the headings"',
        "git status",
        "git push",
      ],
    },
    {
      id: "rejected",
      run: [
        "git switch main",
        writeFile("index.html", INDEX_LATER),
        'git commit -am "Open until 15:00"',
        "git push",
      ],
      refusals: ["git push"],
    },
    { id: "integrate", run: ["git pull --no-rebase", "git push"] },
    { id: "force" },
  ],
  yourTurn: {
    goal: "Publish dark-mode to origin so Sam can review it, and keep it linked to origin's copy.",
    world: teamRepoDarkMode,
    target: published,
    solution: ["git push -u origin dark-mode"],
    hints: {
      nudge:
        "origin has never heard of dark-mode. Where should the branch go, and should yours remember it?",
      pointer:
        "git push -u origin <branch> creates the branch on origin and sets it as your branch's upstream, so later pushes and pulls know where to go.",
      reference: "push",
      next: "Run git push -u origin dark-mode.",
    },
  },
  challenge: {
    goal: "Publish feature to origin and track it, then bring main up to date with origin's main and end on main.",
    world: teamRepoFeature,
    target: featurePublished,
    par: 3,
    solution: ["git push -u origin feature", "git switch main", "git pull"],
  },
});
