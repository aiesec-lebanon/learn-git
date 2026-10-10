import type { TargetSpec } from "@/engine";
import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

/** One new commit on main; README.md recorded, bread.html still untracked. */
const recorded: TargetSpec = {
  commits: {
    first: { name: "the first snapshot", parents: [] },
    next: { name: "the new commit", parents: ["first"] },
  },
  branches: { main: "next" },
  head: { branch: "main" },
  paths: { "README.md": "unmodified", "bread.html": "untracked" },
};

export default defineReferenceEntry({
  id: "commit",
  title: "git commit",
  summary:
    "Records the staging area as a new snapshot with your name, a message and a link to the commit before it. The branch moves forward to it.",
  presets: [PRESETS.staged, PRESETS.dirty],
  variants: [
    {
      id: "message",
      command: 'git commit -m "Add the soup note"',
      after: recorded,
    },
    {
      id: "all",
      command: 'git commit -a -m "Record every tracked change"',
      after: recorded,
    },
    {
      id: "path",
      command: 'git commit -m "Only the README" README.md',
      after: recorded,
    },
  ],
  gotchas: [
    "git commit records only what is staged. Changes you did not git add stay in your files.",
    "Without -m Git opens an editor for the message; an empty message stops the commit.",
    "git commit -a stages changes to tracked files first, but never new files.",
  ],
  lessons: ["b1-1", "b1-2"],
});
