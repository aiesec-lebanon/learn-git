import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "mv",
  title: "git mv",
  summary:
    "Renames or moves a tracked file and stages the change in one step. Git records no rename as such: it spots one by comparing content.",
  presets: [PRESETS.clean, PRESETS.dirty],
  variants: [
    {
      id: "rename",
      command: "git mv README.md about.md",
      after: {
        paths: { "about.md": "staged" },
        worktree: { "README.md": null, "about.md": true },
      },
    },
  ],
  gotchas: [
    "git mv is the same as mv followed by git add for both names. Either way, git status shows a rename.",
    "Git matches a rename by similar content, so a file renamed and heavily edited may show as deleted and new.",
    "git mv will not overwrite an existing file unless you add -f.",
  ],
  lessons: ["b2-3"],
});
