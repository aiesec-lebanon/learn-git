import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

const FIRST_README = "# Recipe site\n\nFamily recipes, one page each.\n";

export default defineReferenceEntry({
  id: "restore",
  title: "git restore",
  summary:
    "Copies a file back from the staging area or a commit. It overwrites your copy, or with --staged only the draft of the next commit.",
  presets: [PRESETS.edited, PRESETS.staged],
  variants: [
    {
      id: "worktree",
      command: "git restore README.md",
      after: { paths: { "README.md": "staged" } },
    },
    {
      id: "staged",
      command: "git restore --staged README.md",
      after: { paths: { "README.md": "modified" } },
    },
    {
      id: "both",
      command: "git restore --staged --worktree README.md",
      after: { paths: { "README.md": "unmodified" } },
    },
    {
      id: "source",
      command: "git restore --source=HEAD~2 README.md",
      after: { worktree: { "README.md": FIRST_README } },
    },
  ],
  gotchas: [
    "git restore <file> throws away edits you never staged or committed. Real Git cannot bring them back.",
    "git restore --staged only unstages. Your file keeps every edit.",
    "--source copies one file from an old commit; no branch moves.",
  ],
  legacy: [
    { older: "git checkout -- README.md", today: "git restore README.md" },
    {
      older: "git reset HEAD README.md",
      today: "git restore --staged README.md",
    },
  ],
  lessons: ["b2-2"],
});
