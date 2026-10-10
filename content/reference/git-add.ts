import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "add",
  title: "git add",
  summary:
    "Copies files as they are now into the staging area, the draft of your next commit. Your files stay where they are.",
  presets: [PRESETS.dirty, PRESETS.staged],
  variants: [
    {
      id: "path",
      command: "git add README.md",
      after: { paths: { "README.md": "staged", "bread.html": "untracked" } },
    },
    {
      id: "dot",
      command: "git add .",
      after: { paths: { "README.md": "staged", "bread.html": "staged" } },
    },
    {
      id: "all",
      command: "git add -A",
      after: { paths: { "README.md": "staged", "bread.html": "staged" } },
    },
    {
      id: "update",
      command: "git add -u",
      after: { paths: { "README.md": "staged", "bread.html": "untracked" } },
    },
  ],
  gotchas: [
    "git add copies the content as it is right now. Edit the file again and the change needs another git add.",
    "git add . covers the folder you are in and everything below it; git add -A covers the whole repository.",
    "git add -u stages changes and deletions of tracked files but leaves new files alone.",
  ],
  lessons: ["b1-1", "b1-2"],
});
