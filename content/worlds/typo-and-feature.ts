import { defineWorld, FIRST_COMMIT, writeFile } from "../define";

export const README_TYPO = "# Recipe site\n\nFamly recipes, one page each.\n";
export const README_FIXED = "# Recipe site\n\nFamily recipes, one page each.\n";
export const APP_JS = 'const recipes = ["Lentil soup"];\n';

/** One commit; then a typo fixed in README.md, a feature started in app.js and a new notes.txt. */
export const typoAndFeature = defineWorld({
  files: { "recipe-site/README.md": README_TYPO, "recipe-site/app.js": APP_JS },
  cwd: "recipe-site",
  setup: [
    ...FIRST_COMMIT,
    writeFile("README.md", README_FIXED),
    writeFile("app.js", `${APP_JS}recipes.push("Apple pie");\n`),
    writeFile("notes.txt", "Ideas: a search box.\n"),
  ],
});
