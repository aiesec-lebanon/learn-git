import type { ReferencePreset } from "../define";
import { recipeSite, recipeSiteWithIdentity } from "../worlds/recipe-site";

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
  noIdentity: {
    id: "no-identity",
    label: "A new repository, no name or email",
    world: recipeSite,
    setup: ["git init"],
  },
} as const satisfies Record<string, ReferencePreset>;
