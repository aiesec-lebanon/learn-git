import type { HistoryEntry } from "@/engine";

export type TranscriptLine = {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
};

export const transcriptOf = (
  entries: readonly HistoryEntry[],
): TranscriptLine[] =>
  entries.map((e) => ({
    command: e.text,
    stdout: e.outcome.output.stdout,
    stderr: e.outcome.output.stderr,
  }));

/** Commands and the output Git printed, as a static terminal. */
export function Transcript({ lines }: { lines: readonly TranscriptLine[] }) {
  if (!lines.length) return null;
  return (
    <div className="rounded-sm bg-term-bg p-3 font-mono text-sm text-term-fg">
      {lines.map((line, i) => (
        <div key={i}>
          <pre className="m-0 whitespace-pre-wrap break-words text-term-accent">
            <span aria-hidden="true">$ </span>
            {line.command}
          </pre>
          {line.stdout ? (
            <pre className="m-0 whitespace-pre-wrap break-words">
              {line.stdout}
            </pre>
          ) : null}
          {line.stderr ? (
            <pre className="m-0 whitespace-pre-wrap break-words text-term-err">
              {line.stderr}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}
