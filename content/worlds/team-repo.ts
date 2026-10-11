import type { ActorScript, SetupStep, Trigger, WorldSpec } from "@/engine";
import { defineWorld, writeFile } from "../define";
import { INDEX, INDEX_LATER, MENU, MENU_YOURS, README } from "./bake-sale";

export const TEAM_URL = "https://hub.test/sam/bake-sale.git";
export const MEETING = `${README}Team meeting: Fridays at 18:00.\n`;
export const MEETING_BAGS = `${MEETING}Bring your own bag.\n`;
export const MENU_RAISED = MENU.replace("$4", "$5");
export const DARK_STYLE = "body { background: #222; color: #eee; }\n";
export const DARK_HEADINGS = `${DARK_STYLE}h1 { color: #fc6; }\n`;
export const VOLUNTEERS = "# Volunteers\n\nSam: setup. Ana: cash box.\n";

const SAM = "/home/sam/bake-sale";
const sam = (run: string): SetupStep => ({ machine: "sam", run });

/** Sam's machine (his own identity) and the learner's (`You`), plus the Hub repository. */
const people = {
  global: {
    "user.name": "You",
    "user.email": "you@team.test",
    "init.defaultBranch": "main",
  },
  machines: {
    sam: {
      global: {
        "user.name": "Sam Rivera",
        "user.email": "sam@team.test",
        "init.defaultBranch": "main",
      },
    },
  },
  hub: { "sam/bake-sale": {} },
} as const;

/** Sam publishes the site: main with two commits, and a `docs` branch. */
const PUBLISHED: readonly SetupStep[] = [
  sam(`git clone -q ${TEAM_URL}`),
  sam(`cd ${SAM}`),
  sam(writeFile("README.md", README)),
  sam(writeFile("index.html", INDEX)),
  sam("git add ."),
  sam('git commit -q -m "First snapshot"'),
  sam(writeFile("menu.html", MENU)),
  sam("git add menu.html"),
  sam('git commit -q -m "Add the menu"'),
  sam("git push -q"),
  sam("git switch -q -c docs"),
  sam("mkdir docs"),
  sam(writeFile("docs/volunteers.md", VOLUNTEERS)),
  sam("git add docs"),
  sam('git commit -q -m "List the volunteers"'),
  sam("git push -q -u origin docs"),
  sam("git switch -q main"),
];

const CLONED: readonly SetupStep[] = [
  ...PUBLISHED,
  `git clone -q ${TEAM_URL}`,
  "cd bake-sale",
];

const SAM_MEETING = `cd ${SAM} && ${writeFile("README.md", MEETING)} && git commit -q -am "Add the team meeting" && git push -q`;

/** Sam adds the team meeting to the README and pushes it to origin's main. */
export const samPushesMeeting = (trigger: Trigger): ActorScript => ({
  id: "sam-meeting",
  machine: "sam",
  name: "Sam",
  trigger,
  run: [SAM_MEETING],
  says: "Sam pushed 1 commit to main on origin: Add the team meeting.",
});

const SAM_PRICE = `cd ${SAM} && git pull -q --no-rebase && ${writeFile("menu.html", MENU_RAISED)} && git commit -q -am "Raise the lemon cake price" && git push -q`;

/** Sam raises the lemon cake price on origin's main (a conflict waiting for anyone who changes it too). */
export const samRaisesPrice = (trigger: Trigger): ActorScript => ({
  id: "sam-price",
  machine: "sam",
  name: "Sam",
  trigger,
  run: [SAM_PRICE],
  says: "Sam pushed 1 commit to main on origin: Raise the lemon cake price.",
});

/** Origin on the Hub and Sam's clone; you have not cloned yet (B5.1 starts here). */
export const teamRepoBeforeClone: WorldSpec = defineWorld({
  ...people,
  setup: PUBLISHED,
});

/** You cloned the team repository into `~/bake-sale`; Sam is about to push. */
export const teamRepo: WorldSpec = defineWorld({ ...people, setup: CLONED });

/** Your clone, with Sam's meeting commit on origin's main and not yet fetched. */
export const teamRepoBehind: WorldSpec = defineWorld({
  ...people,
  setup: [...CLONED, sam(SAM_MEETING)],
});

/** The playground's Team repo: your clone, with Sam pushing twice while you work. */
export const teamRepoPlayground: WorldSpec = defineWorld({
  ...teamRepo,
  actors: [
    samPushesMeeting({ kind: "after-step", step: 2 }),
    samRaisesPrice({ kind: "after-step", step: 6 }),
  ],
});

/** Sam asks for bags in the README (a different file from your hours change). */
export const samAsksForBags = (trigger: Trigger): ActorScript => ({
  id: "sam-bags",
  machine: "sam",
  name: "Sam",
  trigger,
  run: [
    `cd ${SAM} && git pull -q --no-rebase && ${writeFile("README.md", MEETING_BAGS)} && git commit -q -am "Ask for bags" && git push -q`,
  ],
  says: "Sam pushed 1 commit to main on origin: Ask for bags.",
});

/** Sam pushed the team meeting after you cloned, and you committed longer hours: diverged, not yet fetched. */
export const teamRepoDiverged: WorldSpec = defineWorld({
  ...people,
  setup: [
    ...CLONED,
    sam(SAM_MEETING),
    writeFile("index.html", INDEX_LATER),
    'git commit -q -am "Open until 15:00"',
  ],
});

const DARK_MODE: readonly SetupStep[] = [
  writeFile("style.css", DARK_STYLE),
  "git add style.css",
  'git commit -q -m "Add a dark theme"',
];

/** Your clone with an unpublished `dark-mode` branch (one commit, HEAD on it). */
export const teamRepoDarkMode: WorldSpec = defineWorld({
  ...people,
  setup: [...CLONED, "git switch -q -c dark-mode", ...DARK_MODE],
});

/** HEAD on an unpublished `feature` (two commits) while Sam's meeting commit waits on origin's main. */
export const teamRepoFeature: WorldSpec = defineWorld({
  ...people,
  setup: [
    ...CLONED,
    "git switch -q -c feature",
    ...DARK_MODE,
    writeFile("style.css", DARK_HEADINGS),
    'git commit -q -am "Colour the headings"',
    sam(SAM_MEETING),
  ],
});

/** Friday you committed a lower lemon cake price; over the weekend Sam pushed a higher one. The Hub refuses force pushes to main. */
export const teamRepoMonday: WorldSpec = defineWorld({
  ...people,
  hub: {
    "sam/bake-sale": { rules: [{ branch: "main", requirePullRequest: false }] },
  },
  setup: [
    ...CLONED,
    writeFile("menu.html", MENU_YOURS),
    'git commit -q -am "Lower the lemon cake price"',
    sam(SAM_PRICE),
  ],
});

export const TEAM_REPO = "sam/bake-sale";

/** Main takes one approving review before a pull request merges. */
const reviewedMain = {
  [TEAM_REPO]: {
    rules: [
      { branch: "main", requirePullRequest: false, requiredApprovals: 1 },
    ],
  },
} as const;

const PULL_OPENED = "^Hub: open a pull request";

/** Sam asks, on line 1 of style.css, for coloured headings once a pull request opens. */
export const samAsksForHeadings: ActorScript = {
  id: "sam-review",
  machine: "sam",
  name: "Sam",
  trigger: { kind: "after-command", pattern: PULL_OPENED },
  when: "after you open the pull request",
  run: [
    {
      type: "review",
      repo: TEAM_REPO,
      number: 1,
      state: "changes-requested",
      body: "Nearly there.",
      comments: [
        {
          path: "style.css",
          line: 1,
          body: "Could the headings get a warm colour too?",
        },
      ],
    },
  ],
  says: "Sam requested changes on #1: could the headings get a warm colour too?",
};

/** Sam approves pull request #1 after your next plain `git push`. */
export const samApprovesAfterPush: ActorScript = {
  id: "sam-approve",
  machine: "sam",
  name: "Sam",
  trigger: { kind: "after-command", pattern: "^git push$" },
  when: "after you push the fix",
  run: [
    {
      type: "review",
      repo: TEAM_REPO,
      number: 1,
      state: "approved",
      body: "Lovely, thanks.",
    },
  ],
  says: "Sam approved #1.",
};

/** Sam approves pull request #1 as soon as it opens. */
export const samApprovesOnOpen: ActorScript = {
  ...samApprovesAfterPush,
  trigger: { kind: "after-command", pattern: PULL_OPENED },
  when: "after you open the pull request",
};

/** Your clone; main needs Sam's approval before a pull request merges, and Sam reviews (B6.2). */
export const teamRepoReviewed: WorldSpec = defineWorld({
  ...teamRepo,
  hub: reviewedMain,
  actors: [samAsksForHeadings, samApprovesAfterPush],
});

/** As teamRepoReviewed, starting with an unpublished dark-mode branch. */
export const teamRepoDarkModeReviewed: WorldSpec = defineWorld({
  ...teamRepoDarkMode,
  hub: reviewedMain,
  actors: [samAsksForHeadings, samApprovesAfterPush],
});

/** feature (two commits) pushed with upstream, no pull request yet; Sam approves any pull request. */
export const teamRepoFeaturePushed: WorldSpec = defineWorld({
  ...people,
  hub: reviewedMain,
  setup: [
    ...CLONED,
    "git switch -q -c feature",
    ...DARK_MODE,
    writeFile("style.css", DARK_HEADINGS),
    'git commit -q -am "Colour the headings"',
    "git push -q -u origin feature",
  ],
  actors: [samApprovesOnOpen],
});
