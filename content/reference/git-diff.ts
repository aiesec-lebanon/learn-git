import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "diff",
  title: "git diff",
  summary:
    "Shows line by line what differs between two snapshots. Plain git diff compares your files with the staging area, not with the last commit.",
  presets: [PRESETS.edited, PRESETS.dirty],
  variants: [
    { id: "worktree", command: "git diff", shows: "+Vegan friendly." },
    { id: "staged", command: "git diff --staged", shows: "+Serves four." },
    {
      id: "head",
      command: "git diff HEAD",
      shows: "+Serves four.\n+Vegan friendly.",
    },
    { id: "stat", command: "git diff --stat", shows: "README.md | 1 +" },
  ],
  gotchas: [
    "After git add, plain git diff goes quiet. The change moved to git diff --staged.",
    "Lines starting with - were removed and lines starting with + were added; the rest is context.",
    "New untracked files never show up in git diff. git add them first, then use --staged.",
  ],
  lessons: ["b2-1"],
});
