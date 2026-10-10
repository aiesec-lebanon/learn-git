"use client";

import { useId, useState } from "react";
import { historySnapshots, snapshotLabel } from "./recipe-history.model";

const CHANGE = { added: "new", modified: "changed" } as const;

/** Drag through the commits and read the files each snapshot holds; nothing changes. */
export function HistoryScrubber() {
  const snapshots = historySnapshots();
  const [index, setIndex] = useState(snapshots.length - 1);
  const id = useId();
  const snapshot = snapshots[index];
  if (!snapshot) return null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <label htmlFor={id} className="font-display font-bold">
        Files at each commit
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={snapshots.length - 1}
        step={1}
        value={index}
        aria-valuetext={snapshotLabel(index)}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="min-h-11 w-full accent-accent"
      />
      <figcaption className="text-sm font-semibold">
        {snapshotLabel(index)}
      </figcaption>
      <ul className="m-0 grid list-none gap-2 p-0">
        {snapshot.files.map((file) => (
          <li key={file.path} className="grid gap-1">
            <span className="flex items-center gap-2 font-mono text-sm">
              <bdi>{file.path}</bdi>
              {file.change ? (
                <span className="rounded-xs bg-hl px-1.5 font-display text-xs font-semibold text-fg">
                  {CHANGE[file.change]}
                </span>
              ) : null}
            </span>
            <pre className="m-0 overflow-x-auto rounded-sm bg-sunk p-2 text-xs">
              {file.content}
            </pre>
          </li>
        ))}
      </ul>
    </figure>
  );
}
