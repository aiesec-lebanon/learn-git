import type { HistoryEntry } from "./session";
import type { Effect } from "./types";

const changesState = (e: Effect) =>
  e.kind === "repo-created"
    ? !e.reinitialized
    : e.kind !== "refused" && e.kind !== "screen-cleared" && e.kind !== "actor";

/** Par count (LD section 6): successful commands that changed the sandbox's state. */
export function countPar(history: readonly HistoryEntry[]): number {
  return history.filter(
    ({ outcome }) =>
      outcome.meta.counted &&
      outcome.output.exitCode === 0 &&
      outcome.effects.some(changesState),
  ).length;
}
