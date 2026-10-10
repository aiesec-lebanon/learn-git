import { LIMITS } from "@/engine";

/** Typed lines with a cursor; `index === entries.length` is the draft being typed. */
export type InputHistory = {
  readonly entries: readonly string[];
  readonly index: number;
  readonly draft: string;
};

export const emptyHistory: InputHistory = { entries: [], index: 0, draft: "" };

export function remember(history: InputHistory, line: string): InputHistory {
  const entries =
    line.trim() && history.entries.at(-1) !== line
      ? [...history.entries, line].slice(-LIMITS.historySnapshots)
      : history.entries;
  return { entries, index: entries.length, draft: "" };
}

/** Moves through earlier lines (-1) or later ones (+1); returns the line to show. */
export function browse(
  history: InputHistory,
  direction: -1 | 1,
  current: string,
): { history: InputHistory; line: string } {
  const index = Math.min(
    history.entries.length,
    Math.max(0, history.index + direction),
  );
  const draft =
    history.index === history.entries.length ? current : history.draft;
  const line =
    index === history.entries.length ? draft : (history.entries[index] ?? "");
  return { history: { ...history, index, draft }, line };
}

/** A multi-line paste runs line by line, like `;`, up to the sandbox cap. */
export function splitPaste(
  text: string,
): { lines: readonly string[] } | { error: string } {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (lines.length > LIMITS.pasteLines)
    return {
      error: `not simulated here: pasting more than ${LIMITS.pasteLines} lines at once`,
    };
  return { lines };
}
