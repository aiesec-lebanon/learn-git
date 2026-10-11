import type { HistoryEntry } from "./session";
import type { Effect } from "./types";

const changesState = (e: Effect) =>
  e.kind === "repo-created"
    ? !e.reinitialized
    : e.kind !== "refused" && e.kind !== "screen-cleared" && e.kind !== "actor";

/** A merge that stops on a conflict still did its work: it counts. */
const paused = (e: Effect) => e.kind === "operation" && e.phase === "paused";

/** Whether the entry is a step par counts (LD section 6): the learner's, successful, and it changed the sandbox's state. */
export const countsForPar = ({ outcome, actor }: HistoryEntry): boolean =>
  actor === undefined &&
  outcome.meta.counted &&
  (outcome.output.exitCode === 0 || outcome.effects.some(paused)) &&
  outcome.effects.some(changesState);

export function countPar(history: readonly HistoryEntry[]): number {
  return history.filter(countsForPar).length;
}
