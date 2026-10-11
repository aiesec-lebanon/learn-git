import { defineReferenceEntry } from "../define";
import { HUB_PRESETS } from "./hub-presets";

export default defineReferenceEntry({
  id: "hub-create-repository",
  hub: true,
  title: "Create repository",
  summary:
    "Makes a new repository on the Hub under your account. Empty, it waits for your first push; with a README, .gitignore or licence it starts with a commit of its own.",
  presets: [HUB_PRESETS.local, HUB_PRESETS.taken],
  variants: [
    {
      id: "empty",
      label: "Create recipes, empty",
      command: { type: "create-repository", name: "recipes" },
      after: {
        hub: { origin: { exists: true } },
        remotes: { origin: { main: null } },
      },
    },
    {
      id: "readme",
      label: "Create recipes with a README",
      command: { type: "create-repository", name: "recipes", readme: true },
      after: { remotes: { origin: { main: "initial" } } },
    },
    {
      id: "extras",
      label: "Create recipes with a .gitignore and the MIT licence",
      command: {
        type: "create-repository",
        name: "recipes",
        gitignore: "node",
        license: "mit",
      },
      after: { remotes: { origin: { main: "initial" } } },
    },
    {
      id: "taken",
      label: "Create recipes when it already exists",
      command: { type: "create-repository", name: "recipes" },
      preset: "taken",
      shows: "you/recipes already exists on the Hub.",
    },
  ],
  gotchas: [
    "If you already have commits, create the repository empty. A README made on the Hub is a first commit unrelated to yours, so your first push is rejected.",
    "After creating it, git remote add origin with its address and git push -u origin main send your history.",
    "Names take letters, digits, dots, hyphens and underscores; the Hub refuses a name you already use, whatever its case.",
  ],
  lessons: ["b6-1"],
});
