import { defineCapstone } from "../define";
import { MAIN_HISTORY } from "../lessons/b3-1/scene";
import { recipeSiteDetached } from "../worlds/recipe-site";

export default defineCapstone({
  chapter: "b3",
  goal: "Keep the detached experiment on a branch named experiment. Start a menu branch at main and a photos branch at the first snapshot, with one commit on each. End with HEAD on main and main unchanged.",
  world: recipeSiteDetached,
  target: {
    repo: "recipe-site",
    commits: {
      ...MAIN_HISTORY,
      experiment: { name: "the detached experiment", parents: ["soup"] },
      menu: { name: "the commit on menu", parents: ["mention"] },
      photos: { name: "the commit on photos", parents: ["first"] },
    },
    branches: {
      main: "mention",
      experiment: "experiment",
      menu: "menu",
      photos: "photos",
    },
    head: { branch: "main" },
    clean: true,
  },
  solution: [
    "git switch -c experiment",
    "git switch -c menu main",
    'echo "<p>Apple pie is coming soon.</p>" >> index.html',
    'git commit -am "Announce the apple pie"',
    "git switch -c photos main~2",
    'echo "Photos coming soon." >> README.md',
    'git commit -am "Promise photos"',
    "git switch main",
  ],
  hints: {
    nudge: "Which commit needs a name before HEAD leaves it?",
    pointer:
      "git switch -c <name> <start> makes a branch at any commit and moves HEAD onto it; main~2 names the commit two before main.",
    reference: "switch",
    next: "Run git switch -c experiment first. Then git switch -c menu main, edit and commit; git switch -c photos main~2, edit and commit; finish with git switch main.",
  },
});
