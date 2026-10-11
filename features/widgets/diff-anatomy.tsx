"use client";

import { useId, useState } from "react";
import { DiffLines } from "./diff-lens";
import { ANATOMY, anatomySample, type AnatomyPart } from "./diff-lens.model";

const PARTS = Object.keys(ANATOMY) as AnatomyPart[];

/** The parts of a unified diff: pick one, or point at a line, to outline it and read what it means. */
export function DiffAnatomy() {
  const [part, setPart] = useState<AnatomyPart>("hunk");
  const name = useId();
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <fieldset className="m-0 flex flex-wrap gap-x-4 border-0 p-0">
        <legend className="mb-1 font-display font-bold">Parts of a diff</legend>
        {PARTS.map((p) => (
          <label
            key={p}
            className="flex min-h-11 cursor-pointer items-center gap-2"
          >
            <input
              type="radio"
              name={name}
              value={p}
              checked={p === part}
              onChange={() => setPart(p)}
              className="size-5 accent-accent"
            />
            {ANATOMY[p].label}
          </label>
        ))}
      </fieldset>
      <DiffLines lines={anatomySample()} lit={part} onPoint={setPart} />
      <figcaption className="text-sm">{ANATOMY[part].meaning}</figcaption>
    </figure>
  );
}
