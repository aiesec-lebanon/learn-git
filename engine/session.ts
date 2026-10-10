import { LIMITS } from "./limits";
import { mergeOutcomes, resume } from "./execute";
import { runLine } from "./run";
import type { InteractionRequest, Outcome, World } from "./types";

/** One command the learner ran, as text, with what it did. */
export type HistoryEntry = { readonly text: string; readonly outcome: Outcome };

export type SessionSnapshot = {
  readonly world: World;
  /** Entries Rewind can still undo, oldest first; the last is step `step`. */
  readonly history: readonly HistoryEntry[];
  /** Commands run in the current timeline. */
  readonly step: number;
  /** The earliest step Rewind can reach (older snapshots were dropped). */
  readonly floor: number;
  /** Entries of the latest `run`; empty after a rewind. */
  readonly latest: readonly HistoryEntry[];
  /** What the latest command asks of the UI, if anything. */
  readonly pending: InteractionRequest | null;
};

const entriesOf = (world: World, line: string) => {
  const ran = runLine(world, line);
  return ran.outcomes.map((outcome, i): HistoryEntry => ({
    text: ran.texts[i] ?? "",
    outcome,
  }));
};

/** The only stateful engine object: history, Rewind and previews over the pure engine. */
export class Session {
  private readonly cap: number;
  private worlds: World[];
  private entries: HistoryEntry[] = [];
  private latest: readonly HistoryEntry[] = [];
  private floor = 0;
  private snapshot: SessionSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(world: World, options: { historyCap?: number } = {}) {
    this.worlds = [world];
    this.cap = options.historyCap ?? LIMITS.historySnapshots;
  }

  /** Runs a typed line; one history entry per command it ran. */
  run(line: string): readonly HistoryEntry[] {
    const ran = entriesOf(this.world, line);
    for (const entry of ran) {
      this.entries.push(entry);
      this.worlds.push(entry.outcome.world);
    }
    const excess = this.entries.length - this.cap;
    if (excess > 0) {
      this.entries.splice(0, excess);
      this.worlds.splice(0, excess);
      this.floor += excess;
    }
    this.latest = ran;
    this.changed();
    return ran;
  }

  /** Answers the editor the last command waits for (null = closed unsaved). */
  resume(answer: string | null): void {
    const last = this.entries.at(-1);
    if (last?.outcome.request?.kind !== "editor") return;
    const entry: HistoryEntry = {
      text: last.text,
      outcome: mergeOutcomes(last.outcome, resume(this.world, answer)),
    };
    this.entries[this.entries.length - 1] = entry;
    this.worlds[this.worlds.length - 1] = entry.outcome.world;
    this.latest = [entry];
    this.changed();
  }

  /** What the line would do, without recording anything. */
  preview(line: string): readonly HistoryEntry[] {
    return entriesOf(this.world, line);
  }

  /** Returns the sandbox to the state after `step` commands. */
  rewindTo(step: number): void {
    const at = Math.max(step, this.floor) - this.floor;
    if (at >= this.entries.length) return;
    this.entries.length = at;
    this.worlds.length = at + 1;
    this.latest = [];
    this.changed();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The same object until something changes (for `useSyncExternalStore`). */
  getSnapshot(): SessionSnapshot {
    this.snapshot ??= {
      world: this.world,
      history: [...this.entries],
      step: this.floor + this.entries.length,
      floor: this.floor,
      latest: this.latest,
      pending: this.entries.at(-1)?.outcome.request ?? null,
    };
    return this.snapshot;
  }

  private get world(): World {
    return this.worlds[this.worlds.length - 1] as World;
  }

  private changed(): void {
    this.snapshot = null;
    for (const listener of this.listeners) listener();
  }
}
