import { defineLesson } from "../../define";
import { recipeSite, recipeSiteWithIdentity } from "../../worlds/recipe-site";

const firstSnapshot = {
  repo: "recipe-site",
  commits: {
    first: {
      name: "the first snapshot",
      parents: [],
      files: { "README.md": true, "index.html": true },
    },
  },
  branches: { main: "first" },
  head: { branch: "main" },
  clean: true,
} as const;

export default defineLesson({
  id: "b1-1",
  world: recipeSite,
  beats: [
    { id: "copies" },
    { id: "snapshot" },
    { id: "init", run: ["git init"] },
    {
      id: "identity",
      run: [
        'git config set --global user.name "Sam Lee"',
        "git config set --global user.email sam@example.com",
      ],
    },
    {
      id: "first-commit",
      run: ["git add .", 'git commit -m "First snapshot of the recipe site"'],
    },
  ],
  yourTurn: {
    goal: "Turn the recipe-site folder into a repository and record its first snapshot.",
    world: recipeSite,
    target: firstSnapshot,
    solution: [
      'git config set --global user.name "Sam Lee"',
      "git config set --global user.email sam@example.com",
      "git init",
      "git add .",
      'git commit -m "First snapshot"',
    ],
    hints: {
      nudge: "What does Git need before it can record anything in this folder?",
      pointer:
        "A repository starts with git init, and every commit records your name and email from git config.",
      reference: "init",
      next: 'Run git init and set user.name and user.email with git config set --global. Then git add . stages every file, and git commit -m "First snapshot" records them.',
    },
  },
  challenge: {
    goal: "Record one commit containing both files, leaving nothing to commit.",
    world: recipeSiteWithIdentity,
    target: firstSnapshot,
    par: 3,
    solution: ["git init", "git add .", 'git commit -m "First snapshot"'],
    hints: {
      nudge:
        "This folder is not a repository yet. What has to exist before Git can keep a snapshot?",
      pointer:
        "git init makes the repository, git add . stages every file in the folder, and git commit records what is staged.",
      reference: "init",
      next: 'Run git init, then git add ., then git commit -m "First snapshot".',
    },
  },
});
