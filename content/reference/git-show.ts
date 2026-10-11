import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "show",
  title: "git show",
  summary:
    "Opens one commit: who made it, when, the message, and how its snapshot differs from its parent's. It changes nothing.",
  presets: [PRESETS.history, PRESETS.clean],
  variants: [
    { id: "head", command: "git show", shows: "+Try the lentil soup." },
    { id: "stat", command: "git show --stat", shows: "README.md | 1 +" },
    {
      id: "older",
      command: "git show HEAD~1",
      shows: "+<h1>Lentil soup</h1>",
    },
  ],
  gotchas: [
    "Git stores whole snapshots. The diff you see is worked out on the spot, against the parent.",
    "Without a name, git show opens HEAD, the commit you are on.",
    "HEAD~1 means one commit before HEAD; HEAD~2 goes back two.",
  ],
  lessons: ["b1-3", "b2-1"],
});
