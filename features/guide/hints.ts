import type { HistoryEntry } from "@/engine";

const refusalOf = (entry: HistoryEntry | undefined) =>
  entry?.outcome.effects.find((e) => e.kind === "refused")?.code;

/** The guide offers a nudge after two refusals in a row with the same code. */
export function nudgeDue(history: readonly HistoryEntry[]): boolean {
  const last = refusalOf(history.at(-1));
  return last !== undefined && last === refusalOf(history.at(-2));
}

export const HINT_STEPS = ["nudge", "pointer", "next"] as const;

export const HINT_LABELS: Readonly<
  Record<(typeof HINT_STEPS)[number], string>
> = {
  nudge: "Nudge",
  pointer: "Pointer",
  next: "Next step",
};
