import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "gitignore",
  title: ".gitignore",
  summary:
    "A file of patterns, one per line, naming untracked files Git should leave alone. git status stops listing them and git add skips them.",
  presets: [PRESETS.ignoring, PRESETS.dirty],
  variants: [
    { id: "status", command: "git status -s", shows: "?? .gitignore" },
    {
      id: "ignored",
      command: "git status -s --ignored",
      shows: "!! app.log",
    },
    {
      id: "force",
      command: "git add -f app.log",
      after: { paths: { "app.log": "staged" } },
    },
  ],
  gotchas: [
    "Rules only affect untracked files. A tracked file stays tracked until git rm --cached.",
    "*.log matches in every folder, dist/ matches a folder, and a leading / ties a pattern to the folder of the .gitignore.",
    "A line starting with an exclamation mark takes a file back, but never one inside an ignored folder.",
  ],
  lessons: ["b2-3"],
});
