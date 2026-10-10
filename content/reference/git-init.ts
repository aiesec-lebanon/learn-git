import { defineReferenceEntry, defineWorld } from "../define";
import { emptyFolder } from "../worlds/empty-folder";

const noDefaultBranch = defineWorld({
  dirs: ["project"],
  cwd: "project",
  global: { "user.name": "Sam Lee", "user.email": "sam@example.com" },
});

export default defineReferenceEntry({
  id: "init",
  title: "git init",
  summary:
    "Turns the current folder into a repository: Git creates the hidden .git folder, and HEAD points at a branch that has no commits yet.",
  presets: [
    { id: "folder", label: "A plain folder", world: emptyFolder },
    {
      id: "no-default",
      label: "No init.defaultBranch set",
      world: noDefaultBranch,
    },
    {
      id: "repository",
      label: "Already a repository",
      world: emptyFolder,
      setup: ["git init"],
    },
  ],
  variants: [
    {
      id: "plain",
      command: "git init",
      after: { repo: "project", head: { branch: "main" } },
      shows: "Initialized empty Git repository",
    },
    {
      id: "branch",
      command: "git init -b trunk",
      after: { repo: "project", head: { branch: "trunk" } },
    },
  ],
  gotchas: [
    "git init works on the folder you are in. Check with pwd first, so your home folder does not become a repository.",
    "Without init.defaultBranch, Git names the first branch master and prints a hint about it.",
    "Running git init again in a repository is safe: Git says Reinitialized and keeps the history.",
  ],
  lessons: ["b1-1"],
});
