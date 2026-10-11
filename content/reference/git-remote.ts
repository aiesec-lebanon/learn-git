import { defineReferenceEntry } from "../define";
import { TEAM_URL } from "../worlds/team-repo";
import { PRESETS } from "./presets";

const ANA_URL = "https://hub.test/ana/bake-sale.git";

export default defineReferenceEntry({
  id: "remote",
  title: "git remote",
  summary:
    "Lists the remotes: short names for other copies of the repository, each with an address. A clone starts with one, origin.",
  presets: [PRESETS.cloned],
  variants: [
    { id: "list", command: "git remote", shows: "origin\n" },
    {
      id: "verbose",
      command: "git remote -v",
      shows: `origin\t${TEAM_URL} (fetch)`,
    },
    {
      id: "add",
      command: `git remote add ana ${ANA_URL}`,
      after: { config: { "remote.ana.url": ANA_URL } },
    },
    {
      id: "exists",
      command: `git remote add origin ${ANA_URL}`,
      shows: "remote origin already exists",
    },
  ],
  gotchas: [
    "origin is only a name. A remote is a nickname plus an address; nothing is copied until you fetch, pull or push.",
    "Adding a remote does not contact it. A wrong address shows up on the first git fetch.",
  ],
  lessons: ["b5-1"],
});
