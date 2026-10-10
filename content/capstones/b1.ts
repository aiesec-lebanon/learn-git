import { defineCapstone } from "../define";
import { recipeSiteFiles, recipeSiteWithIdentity } from "../worlds/recipe-site";

const readme = recipeSiteFiles["recipe-site/README.md"];
const index = recipeSiteFiles["recipe-site/index.html"];

export default defineCapstone({
  chapter: "b1",
  goal: "Make the recipe-site folder a repository with three commits: the folder as it is, then a change to README.md alone, then a change to index.html. Edit both files before the second commit.",
  world: recipeSiteWithIdentity,
  target: {
    repo: "recipe-site",
    commits: {
      first: {
        name: "the first snapshot",
        parents: [],
        files: { "README.md": readme, "index.html": index },
      },
      readme: {
        name: "the README change",
        parents: ["first"],
        files: { "README.md": true, "index.html": index },
      },
      page: {
        name: "the page change",
        parents: ["readme"],
        files: { "README.md": true, "index.html": true },
      },
    },
    branches: { main: "page" },
    head: { branch: "main" },
    clean: true,
  },
  solution: [
    "git init",
    "git add .",
    'git commit -m "First snapshot"',
    'echo "New recipes every week." >> README.md',
    'echo "<p>More soon.</p>" >> index.html',
    "git add README.md",
    'git commit -m "Describe the update plan"',
    "git add index.html",
    'git commit -m "Tease more recipes"',
  ],
});
