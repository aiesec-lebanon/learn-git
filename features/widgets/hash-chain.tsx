"use client";

import { useId, useState } from "react";
import { Button } from "@/ui/button";
import { historySnapshots, ripple } from "./recipe-history.model";

/** Edit the first commit's message and watch every later ID change; history stays as it is. */
export function HashChain() {
  const original = historySnapshots()[0]?.subject ?? "";
  const [subject, setSubject] = useState(original);
  const id = useId();
  const rows = ripple(subject);
  const changed = rows.filter((r) => r.old !== r.new).length;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <div className="grid gap-1">
        <label htmlFor={id} className="font-display font-bold">
          The first commit&apos;s message
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={id}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-sm border-2 border-line-strong bg-sunk px-3 text-fg"
          />
          <Button
            onClick={() => setSubject(original)}
            disabled={subject === original}
          >
            Reset
          </Button>
        </div>
      </div>
      <ol className="m-0 grid list-none gap-1 p-0 font-mono text-sm">
        {rows.map((row, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center gap-x-2 rounded-sm bg-sunk px-2 py-1"
          >
            <span>{row.old}</span>
            {row.old === row.new ? (
              <span className="font-display text-xs text-fg-muted">
                unchanged
              </span>
            ) : (
              <>
                <span aria-hidden="true">→</span>
                <span className="sr-only">becomes</span>
                <span className="rounded-xs bg-hl px-1 text-fg">{row.new}</span>
              </>
            )}
            <bdi className="min-w-0 truncate font-display">{row.subject}</bdi>
          </li>
        ))}
      </ol>
      <output className="text-sm">
        {changed
          ? `${changed} of ${rows.length} commit IDs would change. Your history stays as it is.`
          : "Every ID matches your history."}
      </output>
    </figure>
  );
}
