import type { ReferenceEntry } from "../define";
import init from "./git-init";

/** Reference entries in course order; IDs match `git <cmd> -h`. */
export const REFERENCE: readonly ReferenceEntry[] = [init];

export const referenceById = (id: string): ReferenceEntry | undefined =>
  REFERENCE.find((entry) => entry.id === id);
