import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

const KIT = {
  first: { name: "the first snapshot", parents: [] },
  sam: { name: "Sam's pricing commit", parents: ["first"] },
  yours: { name: "your price change", parents: ["first"] },
  notes: { name: "the bags note", parents: ["yours"] },
};

export default defineReferenceEntry({
  id: "merge",
  title: "git merge",
  summary:
    "Brings another branch's commits into the branch HEAD is on. If yours has nothing new, the label slides forward; otherwise Git records a merge commit with two parents, or pauses on a conflict.",
  presets: [PRESETS.kit, PRESETS.paused],
  variants: [
    {
      id: "fast-forward",
      command: "git merge notes",
      after: { commits: KIT, branches: { main: "notes" } },
    },
    {
      id: "no-ff",
      command: "git merge --no-ff notes",
      after: {
        commits: {
          ...KIT,
          merge: { name: "the merge commit", parents: ["yours", "notes"] },
        },
        branches: { main: "merge" },
      },
    },
    {
      id: "ff-only",
      command: "git merge --ff-only pricing",
      shows: "fatal: Not possible to fast-forward, aborting.",
    },
    {
      id: "conflict",
      command: "git merge pricing",
      shows: "CONFLICT (content): Merge conflict in menu.html",
    },
    {
      id: "abort",
      command: "git merge --abort",
      preset: "paused",
      after: { clean: true, branches: { main: "yours" }, commits: KIT },
    },
  ],
  gotchas: [
    "A fast-forward makes no new commit. --no-ff records a merge commit anyway; --ff-only refuses anything but a fast-forward.",
    "During a conflict, edit each file, mark it resolved with git add, then git commit (or git merge --continue) finishes the merge.",
    "git merge --abort puts the staging area and working tree back as they were before the merge.",
  ],
  lessons: ["b4-1", "b4-2", "b4-3"],
});
