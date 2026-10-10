import { defineWorld, FIRST_COMMIT } from "../define";

/** The folder's starting files, by path from home. */
export const recipeSiteFiles = {
  "recipe-site/README.md": "# Recipe site\n\nFamily recipes, one page each.\n",
  "recipe-site/index.html":
    '<!doctype html>\n<title>Recipes</title>\n<h1>Recipes</h1>\n<ul>\n  <li><a href="soup.html">Lentil soup</a></li>\n</ul>\n',
} as const;

/** A small website folder, no repository; Git does not know who you are yet. */
export const recipeSite = defineWorld({
  files: recipeSiteFiles,
  cwd: "recipe-site",
  global: { "init.defaultBranch": "main" },
});

/** The same folder with your name and email already set. */
export const recipeSiteWithIdentity = defineWorld({
  files: recipeSiteFiles,
  cwd: "recipe-site",
});

/** The folder recorded as its first commit, nothing changed since. */
export const recipeSiteCommitted = defineWorld({
  ...recipeSiteWithIdentity,
  setup: FIRST_COMMIT,
});

/** Three commits: the first snapshot, the soup page, then the README mentioning it. */
export const recipeSiteHistory = defineWorld({
  ...recipeSiteWithIdentity,
  setup: [
    ...FIRST_COMMIT,
    'echo "<h1>Lentil soup</h1>" > soup.html',
    "git add soup.html",
    'git commit -m "Add the soup recipe"',
    'echo "Try the lentil soup." >> README.md',
    'git commit -am "Mention the soup in the README"',
  ],
});

/** One commit; then README.md edited to link a new, untracked dessert.html. */
export const recipeSiteDessert = defineWorld({
  ...recipeSiteWithIdentity,
  setup: [
    ...FIRST_COMMIT,
    'echo "<h1>Apple pie</h1>" > dessert.html',
    'echo "Desserts: see dessert.html." >> README.md',
  ],
});
