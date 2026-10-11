import { narrate, type HistoryEntry } from "@/engine";

const refused = (entry: HistoryEntry) =>
  entry.outcome.effects.some((e) => e.kind === "refused");

const actorOf = (entry: HistoryEntry | undefined) =>
  entry?.outcome.effects.find((e) => e.kind === "actor")?.actor;

/** A teammate's script speaks once: its steps fold into the last one, which carries what it says. */
const folded = (entry: HistoryEntry, i: number, all: readonly HistoryEntry[]) =>
  !actorOf(entry) || actorOf(entry) !== actorOf(all[i + 1]);

/** What the region says after a run: each command's summary, with Git's first line when it refused. */
export function announcementFor(entries: readonly HistoryEntry[]): string {
  return entries
    .filter(folded)
    .map((entry) => {
      const { request } = entry.outcome;
      if (request?.kind === "editor") {
        return `The editor opened for ${request.file}.`;
      }
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
