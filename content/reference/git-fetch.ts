import type { TargetSpec } from "@/engine";
import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

/** Sam's meeting commit is here as origin/main; your main has not moved. */
const FETCHED = {
  commits: {
    menu: { name: "the menu commit", message: "Add the menu" },
    meeting: {
      name: "Sam's meeting commit",
      parents: ["menu"],
      message: "Add the team meeting",
    },
  },
  exact: false,
  branches: { main: "menu" },
  remotes: { origin: { main: "meeting" } },
  clean: true,
} satisfies TargetSpec;

export default defineReferenceEntry({
  id: "fetch",
  title: "git fetch",
  summary:
    "Downloads the commits a remote has and you don't, and moves your origin/ labels to match. Your branches and files stay as they are.",
  presets: [PRESETS.behind, PRESETS.diverged],
  variants: [
    { id: "fetch", command: "git fetch", after: FETCHED },
    { id: "origin", command: "git fetch origin", after: FETCHED },
    {
      id: "output",
      command: "git fetch",
      shows: "main       -> origin/main",
    },
  ],
  gotchas: [
    "Fetching never changes your branches or your files. git status afterwards says whether you are behind, ahead or diverged.",
    "To bring the fetched commits into your branch, merge origin/main or use git pull, which is fetch and merge in one.",
    "origin/main shows origin as of your last contact. It goes stale until the next fetch, pull or push.",
  ],
  lessons: ["b5-2"],
});
