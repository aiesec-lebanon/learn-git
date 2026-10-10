"use client";

import { useMemo } from "react";
import type { TargetSpec } from "@/engine";
import { CommitGraph, graphLayout } from "@/features/graph/graph";
import { describeTarget, targetView } from "./target";

/** The goal state: a ghost graph for the eye, the same facts as text for everyone. */
export function TargetPanel({ target }: { target: TargetSpec }) {
  const view = useMemo(() => targetView(target), [target]);
  const layout = useMemo(() => (view ? graphLayout(view) : null), [view]);
  return (
    <details
      open
      className="rounded-sm border border-dashed border-line-strong bg-surface p-3"
    >
      <summary className="min-h-11 cursor-pointer content-center font-display font-bold">
        Target
      </summary>
      {view && layout ? (
        <div inert className="mt-2">
          <CommitGraph view={view} layout={layout} label="Target" />
        </div>
      ) : null}
      <ul className="m-0 mt-2 grid gap-1 pl-5 text-sm">
        {describeTarget(target).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
