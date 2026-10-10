import { defineWorld } from "../define";

const files = {
  "recipe-site/README.md": "# Recipe site\n\nFamily recipes, one page each.\n",
  "recipe-site/index.html":
    '<!doctype html>\n<title>Recipes</title>\n<h1>Recipes</h1>\n<ul>\n  <li><a href="soup.html">Lentil soup</a></li>\n</ul>\n',
};

/** A small website folder, no repository; Git does not know who you are yet. */
export const recipeSite = defineWorld({
  files,
  cwd: "recipe-site",
  global: { "init.defaultBranch": "main" },
});

/** The same folder with your name and email already set. */
export const recipeSiteWithIdentity = defineWorld({
  files,
  cwd: "recipe-site",
});
