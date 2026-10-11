import { defineWorld, writeFile } from "../define";
import { bakeSalePriceClash, README_BAG } from "./bake-sale";

/** The price clash plus a notes branch that fast-forwards: one clean merge, one conflict. HEAD on main. */
export const conflictKit = defineWorld({
  ...bakeSalePriceClash,
  setup: [
    ...(bakeSalePriceClash.setup ?? []),
    "git switch -c notes",
    writeFile("README.md", README_BAG),
    'git commit -am "Ask for bags"',
    "git switch main",
  ],
});
