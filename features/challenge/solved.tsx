"use client";

import { useMemo } from "react";
import type { HistoryEntry } from "@/engine";
import { stepText, type Challenge } from "@/content/define";
import { parPath, pathSteps, startFrame, underParWhy } from "./model";
import { PathReplay } from "./path-replay";

/** After a puzzle is solved: your path against par, and other known ways. */
export function Solved({
  challenge,
  history,
}: {
  challenge: Challenge;
  history: readonly HistoryEntry[];
}) {
  const mine = useMemo(() => pathSteps(history), [history]);
  const par = useMemo(() => parPath(challenge), [challenge]);
  const start = useMemo(() => startFrame(challenge.world), [challenge.world]);
  const why = useMemo(
    () => underParWhy(history, challenge),
    [history, challenge],
  );
  return (
    <section
      aria-label="Your path and par"
      className="grid gap-4 rounded-sm border border-line bg-surface p-4 shadow-1"
    >
      {why ? (
        <p className="m-0 max-w-prose">
          <strong>Under par.</strong> {why}
        </p>
      ) : null}
      <PathReplay mine={mine} par={par} start={start} />
      {challenge.underPar?.length ? (
        <div className="grid gap-2">
          <h3 className="m-0 font-display text-lg font-bold">Other ways</h3>
          <ul className="m-0 grid gap-2 pl-5">
            {challenge.underPar.map((path) => (
              <li key={path.solution.map(stepText).join("\n")}>
                {path.solution.map((step, i) => (
                  <span key={i}>
                    {i ? " → " : null}
                    <code className="font-mono text-sm">{stepText(step)}</code>
                  </span>
                ))}
                <br />
                <span className="text-fg-muted">{path.why}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
