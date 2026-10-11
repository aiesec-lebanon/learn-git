import { defineReferenceEntry } from "../define";
import { TEAM_REPO } from "../worlds/team-repo";
import { HUB_PRESETS, openPull } from "./hub-presets";

const reviewed = (state: "approved" | "changes-requested") =>
  ({
    hub: {
      origin: {
        pulls: [
          {
            head: "feature",
            base: "main",
            state: "open",
            review: { by: "you", state },
          },
        ],
      },
    },
  }) as const;

export default defineReferenceEntry({
  id: "hub-pull-request",
  hub: true,
  title: "Pull request and review",
  summary:
    "Proposes merging one branch into another and holds the conversation about it: the diff from the merge base, the commits, comments and reviews.",
  presets: [HUB_PRESETS.pushed, HUB_PRESETS.samsPull],
  variants: [
    {
      id: "open",
      label: "Open a pull request: main ← feature",
      command: openPull("feature", "A dark theme with coloured headings."),
      after: {
        hub: {
          origin: { pulls: [{ head: "feature", base: "main", state: "open" }] },
        },
      },
    },
    {
      id: "approve",
      label: "Approve Sam's pull request",
      command: {
        type: "review",
        repo: TEAM_REPO,
        number: 1,
        state: "approved",
        body: "Looks good.",
      },
      preset: "sams-pull",
      after: reviewed("approved"),
    },
    {
      id: "request-changes",
      label: "Request changes on line 2 of style.css",
      command: {
        type: "review",
        repo: TEAM_REPO,
        number: 1,
        state: "changes-requested",
        body: "One suggestion.",
        comments: [
          { path: "style.css", line: 2, body: "A warmer colour, perhaps?" },
        ],
      },
      preset: "sams-pull",
      after: reviewed("changes-requested"),
    },
    {
      id: "same-branch",
      label: "Open a pull request: main ← main",
      command: openPull("main"),
      shows: "Pick two different branches to compare.",
    },
  ],
  gotchas: [
    "The diff starts at the merge base (a three-dot diff), so it shows only what the branch adds, not what main gained since.",
    "A pull request follows its branch: every push to the branch adds commits to it. There is nothing to reopen.",
    "You cannot approve your own pull request; a teammate's approval is what a protected main counts.",
  ],
  lessons: ["b6-2"],
});
