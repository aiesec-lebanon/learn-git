import { defineReferenceEntry } from "../define";
import { MAIN_HISTORY } from "../lessons/b3-1/scene";
import { PRESETS } from "./presets";

const WITH_DARK = {
  ...MAIN_HISTORY,
  dark: { name: "the dark stylesheet", parents: ["mention"] },
};

export default defineReferenceEntry({
  id: "switch",
  title: "git switch",
  summary:
    "Moves HEAD to another branch and changes your files to match its commit. With -c it creates the branch first; with --detach HEAD sits on a commit instead of a branch.",
  presets: [PRESETS.branches, PRESETS.branchesEdited],
  variants: [
    {
      id: "branch",
      command: "git switch dark-mode",
      after: { head: { branch: "dark-mode" } },
    },
    {
      id: "create",
      command: "git switch -c footer",
      after: {
        commits: WITH_DARK,
        branches: { footer: "mention" },
        head: { branch: "footer" },
      },
    },
    {
      id: "detach",
      command: "git switch --detach HEAD~1",
      after: { commits: WITH_DARK, head: { detached: "soup" } },
    },
    {
      id: "back",
      command: "git switch -",
      after: { head: { branch: "dark-mode" } },
    },
  ],
  gotchas: [
    "Edits you haven't committed come along when you switch. Git refuses only when switching would overwrite them.",
    "git switch <commit> refuses: it expects a branch. Add --detach to visit a commit.",
    "Commits made with HEAD detached fade when you leave them. Name them first with git switch -c <name>.",
  ],
  legacy: [
    { older: "git checkout dark-mode", today: "git switch dark-mode" },
    { older: "git checkout -b footer", today: "git switch -c footer" },
  ],
  lessons: ["b3-1", "b3-3"],
});
