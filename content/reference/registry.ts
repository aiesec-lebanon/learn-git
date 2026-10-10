import type { ReferenceEntry } from "../define";
import add from "./git-add";
import commit from "./git-commit";
import config from "./git-config";
import init from "./git-init";
import status from "./git-status";

/** Reference entries in course order; IDs match `git <cmd> -h`. */
export const REFERENCE: readonly ReferenceEntry[] = [
  config,
  init,
  status,
  add,
  commit,
];

export const referenceById = (id: string): ReferenceEntry | undefined =>
  REFERENCE.find((entry) => entry.id === id);
