"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { machineOf, type HistoryEntry, type Session } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import { complete } from "./complete";
import { browse, emptyHistory, remember, splitPaste } from "./history";

/** Entries since the last `clear`. */
function visible(history: readonly HistoryEntry[]): readonly HistoryEntry[] {
  const at = history.findLastIndex((e) =>
    e.outcome.effects.some((x) => x.kind === "screen-cleared"),
  );
  return history.slice(at + 1);
}

function Output({ entry }: { entry: HistoryEntry }) {
  const { stdout, stderr } = entry.outcome.output;
  const request = entry.outcome.request;
  return (
    <li className="m-0">
      <pre className="m-0 whitespace-pre-wrap break-words text-term-accent">
        <span aria-hidden="true">$ </span>
        {entry.text}
      </pre>
      {stdout ? (
        <pre className="m-0 whitespace-pre-wrap break-words">{stdout}</pre>
      ) : null}
      {stderr ? (
        <pre className="m-0 whitespace-pre-wrap break-words text-term-err">
          {stderr}
        </pre>
      ) : null}
      {entry.outcome.notes.map((note, i) => (
        <p key={i} className="m-0 text-term-muted">
          {note}
        </p>
      ))}
      {request?.kind === "open-reference" ? (
        <p className="m-0 text-term-muted">
          Help for git {request.entryId} lives in the command reference.
        </p>
      ) : null}
    </li>
  );
}

/** A labelled command line over the session; output is a log that does not speak (the announcer does). */
export function Terminal({ session }: { session: Session }) {
  const { history: entries, world } = useSession(session);
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState(emptyHistory);
  const [hint, setHint] = useState<string | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const hintId = useId();
  const shown = visible(entries);
  const machine = machineOf(world);
  const cwd = machine.cwd.startsWith(machine.home)
    ? `~${machine.cwd.slice(machine.home.length)}`
    : machine.cwd;

  useLayoutEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  const run = (lines: readonly string[]) => {
    let next = typed;
    for (const line of lines) {
      next = remember(next, line);
      session.run(line);
    }
    setTyped(next);
    setValue("");
    setHint(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (value.trim()) run([value]);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const moved = browse(typed, event.key === "ArrowUp" ? -1 : 1, value);
      setTyped(moved.history);
      setValue(moved.line);
    } else if (event.key === "Tab" && value.trim()) {
      event.preventDefault();
      const done = complete(world, value);
      setValue(done.line);
      setHint(done.options.length ? done.options.join("  ") : null);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!/[\r\n]/.test(text)) return;
    event.preventDefault();
    const pasted = splitPaste(value + text);
    if ("error" in pasted) setHint(pasted.error);
    else run(pasted.lines);
  };

  return (
    <div className="grid overflow-hidden rounded-md bg-term-bg font-mono text-sm text-term-fg">
      <div
        ref={log}
        role="log"
        aria-live="off"
        aria-label="Terminal output"
        // A scrollable region must be reachable by keyboard.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="max-h-80 min-h-24 overflow-y-auto p-3 focus-visible:outline-2 focus-visible:outline-focus"
      >
        <ol className="m-0 grid list-none gap-2 p-0">
          {shown.map((entry, i) => (
            <Output key={i} entry={entry} />
          ))}
        </ol>
      </div>
      <div className="flex items-center gap-2 border-t border-term-muted/40 px-3 py-2">
        <label htmlFor={inputId} className="shrink-0 text-term-accent">
          <span className="sr-only">Command in </span>
          {cwd} $
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          aria-describedby={hintId}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-term-fg outline-none"
        />
      </div>
      <p id={hintId} className="m-0 px-3 pb-2 text-xs text-term-muted">
        {hint ??
          "Enter runs the command; Up and Down recall earlier ones; Tab completes."}
      </p>
    </div>
  );
}
