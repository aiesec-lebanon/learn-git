import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

const HOURS = {
  name: "your hours commit",
  parents: ["menu"],
  message: "Open until 15:00",
};
const MENU = { name: "the menu commit", message: "Add the menu" };

export default defineReferenceEntry({
  id: "push",
  title: "git push",
  summary:
    "Sends your branch's new commits to a remote and moves its branch there. The remote accepts only when that adds commits, unless you force it.",
  presets: [PRESETS.ahead, PRESETS.diverged, PRESETS.unpublished],
  variants: [
    {
      id: "push",
      command: "git push",
      after: {
        commits: { menu: MENU, hours: HOURS },
        exact: false,
        remotes: { origin: { main: "hours" } },
      },
    },
    {
      id: "rejected",
      command: "git push",
      preset: "diverged",
      shows: "! [rejected]",
    },
    {
      id: "upstream",
      command: "git push -u origin dark-mode",
      preset: "unpublished",
      after: {
        commits: { dark: { name: "the dark theme commit" } },
        exact: false,
        branches: { "dark-mode": "dark" },
        remotes: { origin: { "dark-mode": "dark" } },
        config: {
          "branch.dark-mode.remote": "origin",
          "branch.dark-mode.merge": "refs/heads/dark-mode",
        },
      },
    },
    {
      id: "no-upstream",
      command: "git push",
      preset: "unpublished",
      shows: "has no upstream branch",
    },
    {
      id: "force",
      command: "git push --force",
      preset: "diverged",
      after: {
        commits: { menu: MENU, hours: HOURS },
        exact: false,
        remotes: { origin: { main: "hours" } },
      },
    },
  ],
  gotchas: [
    "A rejected push means origin has commits you don't. Pull them in, then push again.",
    "--force makes origin's branch match yours, and commits only origin had drop off it. Protected branches on the Hub refuse it.",
    "A new branch needs git push -u origin <name> once. After that, git push and git pull know where to go.",
  ],
  lessons: ["b5-3"],
});
