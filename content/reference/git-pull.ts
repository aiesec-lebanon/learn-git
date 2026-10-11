import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

const MENU = { name: "the menu commit", message: "Add the menu" };
const MEETING = {
  name: "Sam's meeting commit",
  parents: ["menu"],
  message: "Add the team meeting",
};
const HOURS = "Open until 15:00";

export default defineReferenceEntry({
  id: "pull",
  title: "git pull",
  summary:
    "Fetches from the branch's upstream, then brings those commits into your branch. If only origin moved, the label slides forward; if both sides moved, you choose merge or rebase.",
  presets: [PRESETS.behind, PRESETS.diverged],
  variants: [
    {
      id: "fast-forward",
      command: "git pull",
      after: {
        commits: { menu: MENU, meeting: MEETING },
        exact: false,
        branches: { main: "meeting" },
        clean: true,
      },
    },
    {
      id: "reconcile",
      command: "git pull",
      preset: "diverged",
      shows: "Need to specify how to reconcile divergent branches.",
    },
    {
      id: "merge",
      command: "git pull --no-rebase",
      preset: "diverged",
      after: {
        commits: {
          menu: MENU,
          meeting: MEETING,
          hours: {
            name: "your hours commit",
            parents: ["menu"],
            message: HOURS,
          },
          merge: { name: "the merge commit", parents: ["hours", "meeting"] },
        },
        exact: false,
        branches: { main: "merge" },
      },
    },
    {
      id: "rebase",
      command: "git pull --rebase",
      preset: "diverged",
      after: {
        commits: {
          meeting: MEETING,
          menu: MENU,
          replayed: {
            name: "your hours commit, replayed",
            parents: ["meeting"],
            message: HOURS,
          },
        },
        exact: false,
        branches: { main: "replayed" },
      },
    },
    {
      id: "ff-only",
      command: "git pull --ff-only",
      preset: "diverged",
      shows: "Not possible to fast-forward, aborting.",
    },
  ],
  gotchas: [
    "When both sides have new commits, Git stops and asks. Pick --no-rebase (merge) or --rebase once, or set pull.rebase in your config.",
    "A pull can stop on a conflict like any merge or rebase. Resolve it, then commit (merge) or git rebase --continue (rebase).",
    "git pull is git fetch plus a merge or rebase. Fetch alone first when you want to look before anything changes.",
  ],
  lessons: ["b5-2"],
});
