import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "rm",
  title: "git rm",
  summary:
    "Stops tracking a file and stages that removal for the next commit. Plain git rm deletes your copy too; --cached keeps it on disk.",
  presets: [PRESETS.clean, PRESETS.dirty],
  variants: [
    {
      id: "delete",
      command: "git rm README.md",
      after: {
        paths: { "README.md": "staged" },
        worktree: { "README.md": null },
      },
    },
    {
      id: "cached",
      command: "git rm --cached README.md",
      after: {
        paths: { "README.md": "untracked" },
        worktree: { "README.md": true },
      },
    },
  ],
  gotchas: [
    "git rm refuses to delete a file with changes no commit holds. --cached keeps the file; -f deletes it anyway.",
    "A file you stop tracking stays in every older commit. If it held a secret, change the secret.",
    "Deleting a file with plain rm works too; git add -A then stages the removal.",
  ],
  lessons: ["b2-3"],
});
