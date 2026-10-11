import type { HistoryEntry } from "./session";
import type { Effect } from "./types";

const changesState = (e: Effect) =>
  e.kind === "repo-created"
    ? !e.reinitialized
    : e.kind !== "refused" && e.kind !== "screen-cleared" && e.kind !== "actor";

/** A merge that stops on a conflict still did its work: it counts. */
const paused = (e: Effect) => e.kind === "operation" && e.phase === "paused";

/** Par count (LD section 6): successful commands that changed the sandbox's state. */
export function countPar(history: readonly HistoryEntry[]): number {
  return history.filter(
    ({ outcome }) =>
      outcome.meta.counted &&
      (outcome.output.exitCode === 0 || outcome.effects.some(paused)) &&
      outcome.effects.some(changesState),
  ).length;
}
