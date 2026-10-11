import type { ReferencePreset } from "../define";
import { conflictKit } from "../worlds/conflict-kit";
import {
  recipeSite,
  recipeSiteHistory,
  recipeSiteMergeReady,
  recipeSiteWithIdentity,
} from "../worlds/recipe-site";

const firstCommit = ["git init", "git add .", 'git commit -m "First snapshot"'];
const changes = [
  'echo "Soup tonight." >> README.md',
  'echo "<h1>Bread</h1>" > bread.html',
];

/** Shared starting states: the recipe site at different moments. */
export const PRESETS = {
  clean: {
    id: "clean",
    label: "Nothing changed",
    world: recipeSiteWithIdentity,
    setup: firstCommit,
  },
  dirty: {
    id: "dirty",
    label: "README.md edited, bread.html new",
    world: recipeSiteWithIdentity,
    setup: [...firstCommit, ...changes],
  },
  staged: {
    id: "staged",
    label: "README.md staged, bread.html new",
    world: recipeSiteWithIdentity,
    setup: [...firstCommit, ...changes, "git add README.md"],
  },
  history: {
    id: "history",
    label: "Three commits, nothing changed",
    world: recipeSiteHistory,
  },
  edited: {
    id: "edited",
    label: "Three commits; README.md staged, then edited again",
    world: recipeSiteHistory,
    setup: [
      'echo "Serves four." >> README.md',
      "git add README.md",
      'echo "Vegan friendly." >> README.md',
    ],
  },
  ignoring: {
    id: "ignoring",
    label: "A .gitignore for *.log, app.log new",
    world: recipeSiteWithIdentity,
    setup: [
      ...firstCommit,
      'echo "*.log" > .gitignore',
      'echo "build finished" > app.log',
    ],
  },
  noIdentity: {
    id: "no-identity",
    label: "A new repository, no name or email",
    world: recipeSite,
    setup: ["git init"],
  },
  branches: {
    id: "branches",
    label: "main, and dark-mode one commit ahead",
    world: recipeSiteMergeReady,
  },
  branchesEdited: {
    id: "branches-edited",
    label: "main and dark-mode; README.md edited",
    world: recipeSiteMergeReady,
    setup: ['echo "Draft." >> README.md'],
  },
  kit: {
    id: "kit",
    label: "notes ahead of main; pricing conflicts with main",
    world: conflictKit,
  },
  paused: {
    id: "paused",
    label: "Merge of pricing paused on a conflict",
    world: conflictKit,
    setup: ["git merge pricing"],
  },
} as const satisfies Record<string, ReferencePreset>;
