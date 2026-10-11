import type { TargetSpec } from "@/engine";
import { defineReferenceEntry } from "../define";
import { TEAM_URL } from "../worlds/team-repo";
import { PRESETS } from "./presets";

/** A clone in `repo`: main checked out, docs only as origin's branch. */
const cloned = (repo: string): TargetSpec => ({
  repo,
  commits: {
    menu: { name: "Sam's menu commit", message: "Add the menu" },
    docs: {
      name: "the volunteers commit",
      parents: ["menu"],
      message: "List the volunteers",
    },
  },
  exact: false,
  branches: { main: "menu", docs: null },
  head: { branch: "main" },
  remotes: { origin: { main: "menu", docs: "docs" } },
  config: { "remote.origin.url": TEAM_URL },
});

export default defineReferenceEntry({
  id: "clone",
  title: "git clone",
  summary:
    "Copies a repository with its whole history into a new folder and checks out its default branch. The copy remembers where it came from as the remote origin.",
  presets: [PRESETS.beforeClone],
  variants: [
    {
      id: "clone",
      command: `git clone ${TEAM_URL}`,
      after: cloned("bake-sale"),
    },
    {
      id: "folder",
      command: `git clone ${TEAM_URL} sale-site`,
      after: cloned("sale-site"),
    },
    {
      id: "missing",
      command: "git clone https://hub.test/sam/cake-stall.git",
      shows: "not found",
    },
  ],
  gotchas: [
    "The clone lands in a new folder named after the repository. cd into it before running other Git commands.",
    "Only the default branch gets a local label. Other branches show up as origin/<name>, and git switch <name> makes a local one that tracks it.",
    "Cloning into a folder that already has files fails. Name another folder as the last argument.",
  ],
  lessons: ["b5-1"],
});
