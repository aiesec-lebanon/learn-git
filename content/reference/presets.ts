import { writeFile, type ReferencePreset } from "../define";
import { INDEX_LATER } from "../worlds/bake-sale";
import { conflictKit } from "../worlds/conflict-kit";
import {
  recipeSite,
  recipeSiteHistory,
  recipeSiteMergeReady,
  recipeSiteWithIdentity,
} from "../worlds/recipe-site";
import {
  teamRepo,
  teamRepoBeforeClone,
  teamRepoBehind,
  teamRepoDarkMode,
  teamRepoDiverged,
} from "../worlds/team-repo";

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
  beforeClone: {
    id: "before-clone",
    label: "Sam's repository on the Hub, not cloned yet",
    world: teamRepoBeforeClone,
  },
  cloned: {
    id: "cloned",
    label: "Your clone, up to date with origin",
    world: teamRepo,
  },
  behind: {
    id: "behind",
    label: "Sam pushed a commit you have not fetched",
    world: teamRepoBehind,
  },
  ahead: {
    id: "ahead",
    label: "Your main one commit ahead of origin",
    world: teamRepo,
    setup: [
      writeFile("index.html", INDEX_LATER),
      'git commit -am "Open until 15:00"',
    ],
  },
  diverged: {
    id: "diverged",
    label: "Your commit and Sam's pushed one; not fetched",
    world: teamRepoDiverged,
  },
  unpublished: {
    id: "unpublished",
    label: "dark-mode committed, not on origin",
    world: teamRepoDarkMode,
  },
} as const satisfies Record<string, ReferencePreset>;
