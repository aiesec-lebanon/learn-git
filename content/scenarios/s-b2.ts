import type { TargetSpec } from "@/engine";
import { defineScenario, writeFile } from "../define";
import { INDEX, MENU, README } from "../worlds/bake-sale";
import { teamRepo } from "../worlds/team-repo";

const INDEX_SUMMER = INDEX.replace("14:00", "16:00");
const MENU_SUMMER = MENU.replace("</ul>", "  <li>Iced tea: $2</li>\n</ul>");
const README_SUMMER = `${README}Summer hours: 10:00 to 16:00.\n`;

const EDITS = {
  "index.html": INDEX_SUMMER,
  "menu.html": MENU_SUMMER,
  "README.md": README_SUMMER,
};

/** main still ends at Sam's menu commit. */
const MAIN_UNTOUCHED = {
  commits: { menu: { name: "Sam's menu commit", message: "Add the menu" } },
  branches: { main: "menu" },
} as const;

const COMMITTED = {
  repo: "bake-sale",
  commits: {
    ...MAIN_UNTOUCHED.commits,
    summer: { name: "your summer commit", files: EDITS },
  },
  exact: false,
  branches: { ...MAIN_UNTOUCHED.branches, summer: "summer" },
  clean: true,
} satisfies TargetSpec;

const MESSAGE = 'git commit -m "Switch to summer hours"';

export default defineScenario({
  id: "s-b2",
  brief: {
    from: "Sam",
    message:
      "Thanks for the summer hours. Can you put them on a branch called summer and push it? I'd like to look before they go on main.",
  },
  goal: "Your three edits are still uncommitted, on main. Get them committed on a new branch, summer, leave main as it is, and push summer to origin.",
  world: {
    ...teamRepo,
    setup: [
      ...(teamRepo.setup ?? []),
      ...Object.entries(EDITS).map(([path, text]) => writeFile(path, text)),
    ],
  },
  acts: [
    {
      id: "branch",
      title: "The edits are on summer",
      goal: "Move to a new branch, summer, with your three edits along.",
      targets: [
        {
          repo: "bake-sale",
          ...MAIN_UNTOUCHED,
          exact: false,
          head: { branch: "summer" },
          worktree: EDITS,
        },
      ],
      hints: {
        nudge:
          "Uncommitted edits do not belong to any branch yet. What happens to them when you make a branch and switch to it?",
        pointer:
          "git switch -c makes a branch at the commit you are on and moves HEAD there. Your edits stay in the folder, so they come along.",
        reference: "switch",
        next: "Run git switch -c summer. git status then shows the same three edits, now on summer.",
      },
    },
    {
      id: "commit",
      title: "Committed on summer",
      goal: "Commit the three edits on summer. main stays at Sam's menu commit.",
      targets: [COMMITTED],
      hints: {
        nudge: "Which of the three edits are staged right now?",
        pointer:
          "git add . stages every change in the folder; a commit then records them on the branch HEAD is on.",
        reference: "commit",
        next: `Run git add . and then ${MESSAGE}.`,
      },
    },
    {
      id: "push",
      title: "summer is on origin",
      goal: "Push summer so Sam can see it.",
      targets: [{ ...COMMITTED, remotes: { origin: { summer: "summer" } } }],
      hints: {
        nudge: "Does origin know about summer yet?",
        pointer:
          "A new branch is published with git push -u origin and its name. The -u makes summer track origin/summer.",
        next: "Run git push -u origin summer.",
      },
    },
  ],
  experts: [
    {
      title: "Carry the edits along",
      solution: [
        "git switch -c summer",
        "git add .",
        MESSAGE,
        "git push -u origin summer",
      ],
      tradeoffs:
        "The shortest way. Uncommitted edits travel with you when the new branch starts at the commit you are on, so nothing has to be set aside.",
    },
    {
      title: "Set the edits aside with stash",
      solution: [
        "git stash",
        "git switch -c summer",
        "git stash pop",
        "git add .",
        MESSAGE,
        "git push -u origin summer",
      ],
      tradeoffs:
        "Two more commands here. Stash earns its place when the branch has to start somewhere else, for example from a newer origin/main, where the switch could otherwise refuse to carry the edits.",
    },
  ],
});
