"use client";

import { useId, useState } from "react";
import type { StageFrame } from "@/features/stage/frame";
import { StageView } from "@/features/stage/stage-view";
import type { PathStep } from "./model";

function Path({
  title,
  steps,
  start,
  at,
}: {
  title: string;
  steps: readonly PathStep[];
  start: StageFrame;
  at: number;
}) {
  const shown = Math.min(at, steps.length);
  return (
    <figure className="m-0 grid min-w-0 content-start gap-2">
      <figcaption className="font-display font-bold">
        {title} ({steps.length} {steps.length === 1 ? "step" : "steps"})
      </figcaption>
      <StageView frame={steps[shown - 1]?.frame ?? start} />
      <ol className="m-0 grid gap-1 pl-5 text-sm">
        {steps.map((step, i) => (
          <li
            key={i}
            aria-current={i === shown - 1 ? "step" : undefined}
            className="aria-[current]:font-semibold aria-[current]:text-accent-ink"
          >
            <code className="font-mono">{step.text}</code>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** Your path and the par path, side by side, moved through together one step at a time. */
export function PathReplay({
  mine,
  par,
  start,
}: {
  mine: readonly PathStep[];
  par: readonly PathStep[];
  start: StageFrame;
}) {
  const id = useId();
  const last = Math.max(mine.length, par.length);
  const [at, setAt] = useState(last);
  const textAt = (steps: readonly PathStep[]) =>
    at === 0
      ? "the start"
      : (steps[Math.min(at, steps.length) - 1]?.text ?? "");
  return (
    <div className="grid gap-3">
      <label htmlFor={id} className="font-display font-bold">
        Step through both paths
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={last}
        step={1}
        value={at}
        aria-valuetext={`Step ${at} of ${last}. Your path: ${textAt(mine)}. Par path: ${textAt(par)}.`}
        onChange={(e) => setAt(Number(e.target.value))}
        className="min-h-11 w-full accent-accent"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Path title="Your path" steps={mine} start={start} at={at} />
        <Path title="Par path" steps={par} start={start} at={at} />
      </div>
    </div>
  );
}
