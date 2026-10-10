import { narrate, type HistoryEntry } from "@/engine";
import { REFUSAL_GUIDE } from "@/content/guide/refusals";
import type { GuidePose } from "@/themes/contract";

/** Full narrates every change (Beginner); light speaks only to refusals; off is silent. */
export type Verbosity = "full" | "light" | "off";

export type GuideLine = {
  readonly pose: GuidePose;
  readonly text: string | null;
};

/**
 * The guide's reaction to the latest run. `achieved` is true when the run
 * reached the current target, the one moment the guide looks pleased.
 */
export function guideLine(
  latest: readonly HistoryEntry[],
  verbosity: Verbosity,
  achieved = false,
): GuideLine {
  if (verbosity === "off" || latest.length === 0)
    return { pose: "idle", text: null };
  const refusal = latest
    .flatMap((e) => e.outcome.effects)
    .find((e) => e.kind === "refused");
  if (refusal?.kind === "refused")
    return { pose: "surprised", text: REFUSAL_GUIDE[refusal.code] };
  const pose = achieved ? "pleased" : "explaining";
  if (verbosity === "light") return { pose, text: null };
  const text = latest
    .flatMap((e) => narrate(e.outcome.effects, e.outcome.world).whatHappened)
    .join(" ");
  return { pose, text };
}
