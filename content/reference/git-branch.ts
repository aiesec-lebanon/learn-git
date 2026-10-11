import { defineReferenceEntry } from "../define";
import { MAIN_HISTORY } from "../lessons/b3-1/scene";
import { PRESETS } from "./presets";

const WITH_DARK = {
  ...MAIN_HISTORY,
  dark: { name: "the dark stylesheet", parents: ["mention"] },
};

export default defineReferenceEntry({
  id: "branch",
  title: "git branch",
  summary:
    "Lists, creates, renames and deletes branches. A branch is a label on one commit; creating one copies no files and leaves HEAD where it is.",
  presets: [PRESETS.branches, PRESETS.history],
  variants: [
    { id: "list", command: "git branch", shows: "* main" },
    { id: "verbose", command: "git branch -v", shows: "Add a dark stylesheet" },
    {
      id: "create",
      command: "git branch footer",
      after: { commits: WITH_DARK, branches: { footer: "mention" } },
    },
    {
      id: "at",
      command: "git branch photos HEAD~2",
      after: { commits: WITH_DARK, branches: { photos: "first" } },
    },
    {
      id: "rename",
      command: "git branch -m dark-mode dark",
      after: {
        commits: WITH_DARK,
        branches: { dark: "dark", "dark-mode": null },
      },
    },
    {
      id: "delete",
      command: "git branch -d dark-mode",
      shows: "error: the branch 'dark-mode' is not fully merged",
    },
    {
      id: "force-delete",
      command: "git branch -D dark-mode",
      after: { branches: { "dark-mode": null } },
    },
  ],
  gotchas: [
    "git branch <name> doesn't switch to the new branch. git switch -c <name> creates it and switches in one step.",
    "-d refuses when the branch holds commits nothing else reaches. -D deletes it anyway, and those commits fade.",
    "Deleting a branch removes only the label; its commits stay while another label reaches them.",
  ],
  lessons: ["b3-1", "b3-2", "b3-3", "b5-1"],
});
