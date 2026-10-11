import { defineReferenceEntry } from "../define";
import { HUB_PRESETS, onPull } from "./hub-presets";

const MERGE = onPull("merge-pull-request");

export default defineReferenceEntry({
  id: "hub-merge",
  hub: true,
  title: "Merging a pull request",
  summary:
    'With "Create a merge commit", the Hub makes a merge commit on the base branch on origin. Your own repository hears about it at your next fetch or pull.',
  presets: [HUB_PRESETS.approved, HUB_PRESETS.opened, HUB_PRESETS.conflicts],
  variants: [
    {
      id: "merge",
      label: "Merge pull request #1",
      command: MERGE,
      after: {
        hub: {
          origin: {
            pulls: [{ head: "feature", base: "main", state: "merged" }],
          },
        },
      },
    },
    {
      id: "unreviewed",
      label: "Merge #1 before anyone approved",
      command: MERGE,
      preset: "opened",
      shows: "main needs 1 approving review before merging.",
    },
    {
      id: "conflicts",
      label: "Merge #1 while it has conflicts",
      command: MERGE,
      preset: "conflicts",
      shows: "This branch has conflicts that must be resolved.",
    },
  ],
  gotchas: [
    "The merge commit exists on origin only. Run git pull on main to bring it into your repository.",
    "Conflicts block the merge. Merge origin/main into your branch, resolve, and push; the pull request updates.",
    "Rules on main can ask for approving reviews first, and a change request blocks the merge until it is answered.",
  ],
  lessons: ["b6-2"],
});
