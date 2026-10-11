import { defineReferenceEntry } from "../define";
import { TEAM_REPO } from "../worlds/team-repo";
import { HUB_PRESETS, onPull, openPull } from "./hub-presets";

export default defineReferenceEntry({
  id: "hub-issues",
  hub: true,
  title: "Issues and closing keywords",
  summary:
    'Issues track work to do. A pull request into the default branch whose description says "Fixes #3" closes issue 3 when it merges.',
  presets: [HUB_PRESETS.issue, HUB_PRESETS.linked],
  variants: [
    {
      id: "open-linked",
      label: 'Open a pull request saying "Fixes #3"',
      command: openPull("fix-footer", "Fixes #3"),
      after: {
        hub: {
          origin: {
            pulls: [{ head: "fix-footer", base: "main", state: "open" }],
            issues: { 3: "open" },
          },
        },
      },
    },
    {
      id: "merge",
      label: "Merge pull request #4",
      command: onPull("merge-pull-request", 4),
      preset: "linked",
      after: { hub: { origin: { issues: { 3: "closed" } } } },
    },
    {
      id: "close",
      label: "Close issue #3 by hand",
      command: { type: "close-issue", repo: TEAM_REPO, number: 3 },
      after: { hub: { origin: { issues: { 3: "closed" } } } },
    },
  ],
  gotchas: [
    "Keywords: close, closes, closed, fix, fixes, fixed, resolve, resolves, resolved, in any case, followed by #number.",
    "Only a pull request into the default branch closes issues. Into any other branch, the keyword only links them.",
    "Plain #3 mentions the issue and links it, without closing anything.",
  ],
  lessons: ["b6-3"],
});
