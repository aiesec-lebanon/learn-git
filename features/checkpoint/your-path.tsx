import { narrate, type HistoryEntry } from "@/engine";

/** The commands run so far, each with what it did. */
export function YourPath({ history }: { history: readonly HistoryEntry[] }) {
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">
        Your path ({history.length} commands)
      </summary>
      <ol className="m-0 grid gap-2 pl-5">
        {history.map((entry, i) => (
          <li key={i}>
            <code className="font-mono">{entry.text}</code>
            <br />
            <span className="text-fg-muted">
              {narrate(entry.outcome.effects, entry.outcome.world).announcement}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
