"use client";

import { useId, useState } from "react";
import {
  SNAPSHOT_COUNT,
  snapshotAt,
  snapshotText,
} from "./snapshot-scrubber.model";

const CHANGE = { added: "new", changed: "changed" } as const;

/** Drag through four commits: each one holds the whole folder (X-02). */
export function SnapshotScrubber() {
  const [index, setIndex] = useState(SNAPSHOT_COUNT - 1);
  const id = useId();
  const snapshot = snapshotAt(index);
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <label htmlFor={id} className="font-display font-bold">
        Snapshots of the recipe site
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={SNAPSHOT_COUNT - 1}
        step={1}
        value={index}
        aria-valuetext={snapshotText(index)}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="min-h-11 w-full accent-accent"
      />
      <figcaption className="text-sm">
        <span className="font-semibold">{snapshotText(index)}</span>
      </figcaption>
      <ul className="m-0 grid list-none gap-1 p-0 font-mono text-sm">
        {snapshot.files.map((file) => (
          <li key={file.path} className="flex items-center gap-2">
            {file.path}
            {file.change ? (
              <span className="rounded-xs bg-hl px-1.5 font-display text-xs font-semibold text-fg">
                {CHANGE[file.change]}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </figure>
  );
}
