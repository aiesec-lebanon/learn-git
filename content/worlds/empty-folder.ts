import { defineWorld } from "../define";

/** An empty project folder; identity and the default branch are preset. */
export const emptyFolder = defineWorld({ dirs: ["project"], cwd: "project" });
