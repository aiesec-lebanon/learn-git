import { defineCapstone, writeFile } from "../define";
import {
  samPushesMeeting,
  TEAM_URL,
  teamRepoBeforeClone,
} from "../worlds/team-repo";

const ROTA = "# Rota\n\nSam: setup. You: tidy up.\n";
const FLYER = "# Flyer\n\nBake sale on Saturday. Bring a friend.\n";

export default defineCapstone({
  chapter: "b5",
  goal: "Clone the team repository from https://hub.test/sam/bake-sale.git and commit a new rota.md on main. Sam pushes right after: merge his work into your main. Then publish a new branch, flyer, with a commit adding flyer.md, so that it tracks origin/flyer.",
  world: {
    ...teamRepoBeforeClone,
    actors: [
      {
        ...samPushesMeeting({ kind: "after-command", pattern: "^git commit" }),
        when: "after your first commit",
      },
    ],
  },
  target: {
    repo: "bake-sale",
    commits: {
      menu: { name: "the menu commit", message: "Add the menu" },
      rota: {
        name: "your rota commit",
        parents: ["menu"],
        files: { "rota.md": true },
      },
      meeting: {
        name: "Sam's meeting commit",
        parents: ["menu"],
        message: "Add the team meeting",
      },
      merge: { name: "the merge of Sam's work", parents: ["rota", "meeting"] },
      flyer: {
        name: "your flyer commit",
        parents: ["merge"],
        files: { "flyer.md": true },
      },
    },
    exact: false,
    branches: { main: "merge", flyer: "flyer" },
    remotes: { origin: { flyer: "flyer" } },
    config: {
      "branch.flyer.remote": "origin",
      "branch.flyer.merge": "refs/heads/flyer",
    },
    clean: true,
  },
  solution: [
    `git clone ${TEAM_URL}`,
    "cd bake-sale",
    writeFile("rota.md", ROTA),
    "git add rota.md",
    'git commit -m "Add the rota"',
    "git pull --no-rebase",
    "git switch -c flyer",
    writeFile("flyer.md", FLYER),
    "git add flyer.md",
    'git commit -m "Add the flyer"',
    "git push -u origin flyer",
  ],
  hints: {
    nudge:
      "After Sam's push, your main and origin's main have each moved on. What brings them back together, and what tells origin about flyer?",
    pointer:
      "git pull --no-rebase fetches Sam's commit and merges it into main. A branch made from there and pushed with -u appears on origin and tracks it.",
    reference: "pull",
    next: "After cloning and committing rota.md, run git pull --no-rebase, then git switch -c flyer, commit flyer.md and git push -u origin flyer.",
  },
});
