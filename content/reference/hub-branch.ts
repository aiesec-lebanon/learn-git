import { defineReferenceEntry } from "../define";
import { HUB_PRESETS, onPull } from "./hub-presets";

export default defineReferenceEntry({
  id: "hub-branch",
  hub: true,
  title: "Delete and restore a branch",
  summary:
    "After a pull request merges, the Hub offers to delete its branch on origin, and to restore it if you change your mind. Your own copies are separate.",
  presets: [HUB_PRESETS.merged, HUB_PRESETS.deleted, HUB_PRESETS.opened],
  variants: [
    {
      id: "delete",
      label: "Delete the branch of #1",
      command: onPull("delete-branch"),
      after: { remotes: { origin: { feature: null } } },
    },
    {
      id: "restore",
      label: "Restore the branch of #1",
      command: onPull("restore-branch"),
      preset: "deleted",
      after: { remotes: { origin: { feature: "tip" } } },
    },
    {
      id: "unmerged",
      label: "Delete the branch of an unmerged #1",
      command: onPull("delete-branch"),
      preset: "opened",
      shows: "Merge pull request #1 before deleting its branch.",
    },
  ],
  gotchas: [
    "Deleting the branch on the Hub leaves your local branch and your origin/ label. git branch -d and git fetch --prune tidy those.",
    "Restoring puts the branch back at the commit the pull request merged.",
    "Protected branches such as main cannot be deleted.",
  ],
  lessons: ["b6-2"],
});
