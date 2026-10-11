import { defineReferenceEntry } from "../define";
import { MAIN_HISTORY } from "../lessons/b3-1/scene";
import { PRESETS } from "./presets";

const WITH_DARK = {
  ...MAIN_HISTORY,
  dark: { name: "the dark stylesheet", parents: ["mention"] },
};

export default defineReferenceEntry({
  id: "checkout",
  title: "git checkout",
  summary:
    "The older all-in-one command: it switches branches and also restores files. Today git switch and git restore split those two jobs, and older tutorials still use checkout.",
  presets: [PRESETS.branchesEdited, PRESETS.branches],
  variants: [
    {
      id: "branch",
      command: "git checkout dark-mode",
      after: { head: { branch: "dark-mode" } },
    },
    {
      id: "create",
      command: "git checkout -b footer",
      after: {
        commits: WITH_DARK,
        branches: { footer: "mention" },
        head: { branch: "footer" },
      },
    },
    {
      id: "commit",
      command: "git checkout dark-mode~1",
      after: { commits: WITH_DARK, head: { detached: "mention" } },
    },
    {
      id: "file",
      command: "git checkout -- README.md",
      after: { paths: { "README.md": "unmodified" } },
    },
  ],
  gotchas: [
    "git checkout <file> discards your edits to that file without asking. Real Git cannot bring them back.",
    "A name that is both a branch and a file is ambiguous. Put -- before file names.",
    "git checkout <commit> detaches HEAD, the same as git switch --detach.",
  ],
  legacy: [
    { older: "git checkout dark-mode", today: "git switch dark-mode" },
    { older: "git checkout -b footer", today: "git switch -c footer" },
    {
      older: "git checkout dark-mode~1",
      today: "git switch --detach dark-mode~1",
    },
    { older: "git checkout -- README.md", today: "git restore README.md" },
  ],
  lessons: ["b3-1", "b3-3"],
});
