import type { ReferenceEntry } from "../define";
import add from "./git-add";
import branch from "./git-branch";
import checkout from "./git-checkout";
import commit from "./git-commit";
import config from "./git-config";
import diff from "./git-diff";
import gitignore from "./gitignore";
import init from "./git-init";
import log from "./git-log";
import merge from "./git-merge";
import mv from "./git-mv";
import restore from "./git-restore";
import rm from "./git-rm";
import show from "./git-show";
import status from "./git-status";
import switchCmd from "./git-switch";

/** Reference entries in course order; IDs match `git <cmd> -h`. */
export const REFERENCE: readonly ReferenceEntry[] = [
  config,
  init,
  status,
  add,
  commit,
  log,
  show,
  diff,
  restore,
  rm,
  mv,
  gitignore,
  branch,
  switchCmd,
  checkout,
  merge,
];

export const referenceById = (id: string): ReferenceEntry | undefined =>
  REFERENCE.find((entry) => entry.id === id);
