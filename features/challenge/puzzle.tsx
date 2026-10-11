"use client";

import { lazy, Suspense, use } from "react";
import { browser } from "react-dom";
import type { Challenge } from "@/content/define";
import { useProgress } from "@/features/progress/progress";

const Sandbox = lazy(() =>
  import("@/features/checkpoint/sandbox").then((m) => ({ default: m.Sandbox })),
);

const PREPARING = (
  <p role="status" className="m-0 text-fg-muted">
    Preparing the sandbox.
  </p>
);

function Runner({ id, challenge }: { id: string; challenge: Challenge }) {
  use(browser("Challenge mode lives in localStorage."));
  if (!useProgress().prefs.challengeMode) return null;
  return (
    <section
      aria-labelledby="puzzle"
      className="grid gap-4 border-t border-line py-10"
    >
      <h2
        id="puzzle"
        tabIndex={-1}
        className="m-0 scroll-mt-24 text-3xl font-bold"
      >
        Puzzle
      </h2>
      <p className="m-0 max-w-prose font-display text-xl">{challenge.goal}</p>
      <p className="m-0 max-w-prose text-fg-muted">
        Par {challenge.par}: commands that change the repository count, and so
        do Hub actions. Reading commands and file edits are free, and Rewind
        takes steps back off the count.
      </p>
      <Suspense fallback={PREPARING}>
        <Sandbox
          sessionKey={`puzzle:${id}`}
          world={challenge.world}
          target={challenge.target}
          hints={challenge.hints}
          challenge={challenge}
          queued={null}
          focus={false}
        />
      </Suspense>
    </section>
  );
}

/** A lesson's puzzle; renders nothing unless challenge mode is on (LD 6). */
export function Puzzle(props: { id: string; challenge: Challenge }) {
  return (
    <Suspense fallback={null}>
      <Runner {...props} />
    </Suspense>
  );
}
