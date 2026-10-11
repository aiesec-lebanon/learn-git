import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "log",
  title: "git log",
  summary:
    "Lists the commits you can reach from where you are, newest first, by following each commit's link to its parent. It changes nothing.",
  presets: [PRESETS.history, PRESETS.clean],
  variants: [
    { id: "long", command: "git log", shows: "Author: Sam Lee" },
    {
      id: "oneline",
      command: "git log --oneline",
      shows: "(HEAD -> main) Mention the soup in the README",
    },
    { id: "graph", command: "git log --oneline --graph", shows: "* " },
    { id: "stat", command: "git log --stat", shows: "soup.html | 1 +" },
  ],
  gotchas: [
    "The newest commit comes first. Follow the list down to walk back in time.",
    "Each ID is a hash of the commit's content, its parent included, so the same work always gets the same ID.",
    "git log -- <file> lists only the commits that changed that file.",
  ],
  lessons: ["b1-3"],
});
