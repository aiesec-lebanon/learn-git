import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "status",
  title: "git status",
  summary:
    "Compares the three places your work lives: the last commit, the staging area and your files. It changes nothing.",
  presets: [PRESETS.dirty, PRESETS.staged, PRESETS.clean],
  variants: [
    {
      id: "long",
      command: "git status",
      shows: "Changes not staged for commit",
    },
    { id: "short", command: "git status -s", shows: " M README.md" },
    { id: "branch", command: "git status -s -b", shows: "## main" },
  ],
  gotchas: [
    "A file can show up twice: staged, and modified again after git add. Both versions are real.",
    "Untracked files are in no commit until you git add them.",
    "In the short form the left column is the staging area and the right column is your files.",
  ],
  lessons: ["b1-1", "b1-2"],
});
