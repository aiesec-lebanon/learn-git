import { narrate, type HistoryEntry } from "@/engine";

const refused = (entry: HistoryEntry) =>
  entry.outcome.effects.some((e) => e.kind === "refused");

/** What the region says after a run: each command's summary, with Git's first line when it refused. */
export function announcementFor(entries: readonly HistoryEntry[]): string {
  return entries
    .map((entry) => {
      const summary = narrate(
        entry.outcome.effects,
        entry.outcome.world,
      ).announcement;
      const first = entry.outcome.output.stderr
        .split("\n")
        .find((l) => l.trim());
      return refused(entry) && first ? `${first.trim()} ${summary}` : summary;
    })
    .join(" ");
}
