import { defineLesson } from "../../define";
import { recipeSite } from "../../worlds/recipe-site";

export default defineLesson({
  id: "b1-1",
  world: recipeSite,
  beats: [
    { id: "copies" },
    { id: "snapshot" },
    { id: "init", run: ["git init"] },
    {
      id: "identity",
      run: [
        'git config set --global user.name "Sam Lee"',
        "git config set --global user.email sam@example.com",
      ],
    },
    {
      id: "first-commit",
      run: ["git add .", 'git commit -m "First snapshot of the recipe site"'],
    },
  ],
  yourTurn: {
    goal: "Turn the recipe-site folder into a repository and record its first snapshot.",
    world: recipeSite,
    target: {
      repo: "recipe-site",
      commits: {
        first: {
          name: "the first snapshot",
          parents: [],
          files: { "README.md": true, "index.html": true },
        },
      },
      branches: { main: "first" },
      head: { branch: "main" },
      clean: true,
    },
    solution: [
      'git config set --global user.name "Sam Lee"',
      "git config set --global user.email sam@example.com",
      "git init",
      "git add .",
      'git commit -m "First snapshot"',
    ],
  },
});
