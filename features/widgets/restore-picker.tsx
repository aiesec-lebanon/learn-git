"use client";

import { useId, useState } from "react";
import { PLACES, restoreDirection, type Place } from "./restore-picker.model";

/** Choose where a file comes from and where it goes; the picker prints the git restore line or says why there is none. */
export function RestorePicker() {
  const [source, setSource] = useState<Place>("head");
  const [target, setTarget] = useState<Place>("index");
  const ids = useId();
  const direction = restoreDirection(source, target);
  const group = (
    key: "source" | "target",
    legend: string,
    value: Place,
    set: (p: Place) => void,
  ) => (
    <fieldset className="m-0 grid gap-1 border-0 p-0">
      <legend className="mb-1 font-display font-bold">{legend}</legend>
      {PLACES.map((p) => (
        <label
          key={p.id}
          className="flex min-h-11 cursor-pointer items-center gap-2"
        >
          <input
            type="radio"
            name={`${ids}${key}`}
            value={p.id}
            checked={p.id === value}
            onChange={() => set(p.id)}
            className="size-5 accent-accent"
          />
          {p.title}
        </label>
      ))}
    </fieldset>
  );

  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <div className="grid grid-cols-2 gap-3">
        {group("source", "Copy from", source, setSource)}
        {group("target", "Copy into", target, setTarget)}
      </div>
      <figcaption className="grid gap-1 text-sm">
        {"command" in direction ? (
          <>
            <code className="w-fit rounded-xs bg-term-bg px-2 py-1 font-mono text-term-fg">
              {direction.command}
            </code>
            <span>{direction.meaning}</span>
            <span className="font-semibold">
              {direction.safe
                ? "Safe: nothing is lost."
                : "Destructive: check what you would lose first."}
            </span>
          </>
        ) : (
          <span>{direction.why}</span>
        )}
      </figcaption>
    </figure>
  );
}
