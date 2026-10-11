"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { labRows, LAB_START } from "./pattern-lab.model";

/** Type .gitignore patterns; files they hide dim, and tracked files show that rules leave them alone. */
export function PatternLab() {
  const [text, setText] = useState(LAB_START);
  const deferred = useDeferredValue(text);
  const rows = useMemo(() => labRows(deferred), [deferred]);
  const id = useId();
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1 sm:grid-cols-2">
      <label className="grid content-start gap-1 font-semibold" htmlFor={id}>
        .gitignore
        <textarea
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={2000}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="rounded-xs border border-line-strong bg-sunk p-2 font-mono text-sm font-normal"
        />
      </label>
      <figcaption className="grid content-start gap-1">
        <span className="font-semibold">The folder</span>
        <ul className="m-0 grid list-none gap-1 p-0 text-sm">
          {rows.map((row) => (
            <li
              key={row.path}
              className={`flex min-w-0 items-center gap-2 ${row.ignored ? "opacity-60" : ""}`}
            >
              <code className="min-w-0 truncate">
                <bdi>{row.path}</bdi>
              </code>
              <span className="ml-auto shrink-0 rounded-xs bg-sunk px-1.5 text-xs font-semibold">
                {row.ignored
                  ? "ignored"
                  : row.matched
                    ? "tracked: rule has no effect"
                    : row.tracked
                      ? "tracked"
                      : "untracked"}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
