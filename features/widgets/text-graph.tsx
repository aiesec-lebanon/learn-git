"use client";

import { useMemo, useState } from "react";
import type { Oid, Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-session";
import { cx } from "@/lib/cx";
import { COMMAND, textGraph } from "./text-graph.model";

/** `git log --oneline --graph --all` beside the drawn graph, synced on hover (B3.2). */
export function TextGraph() {
  const session = useLessonSession();
  return session ? <TextGraphFor session={session} /> : null;
}

function TextGraphFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const lines = useMemo(() => textGraph(world), [world]);
  const [active, setActive] = useState<Oid | null>(null);
  if (!view || !layout || !view.commits.length) return null;
  const shown = view.commits.some((c) => c.oid === active) ? active : null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Point at a line of <code>{COMMAND}</code> or at a commit: the same
        commit lights up in both drawings.
      </figcaption>
      <pre className="m-0 overflow-x-auto rounded-sm bg-term-bg p-3 font-mono text-sm text-term-fg">
        {lines.map((line, i) =>
          line.oid ? (
            <button
              key={i}
              type="button"
              aria-pressed={shown === line.oid}
              onClick={() => setActive(line.oid)}
              onPointerEnter={() => setActive(line.oid)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(line.oid)}
              onBlur={() => setActive(null)}
              className={cx(
                "block w-full rounded-xs text-left whitespace-pre focus-visible:outline-2 focus-visible:outline-focus",
                shown === line.oid && "bg-hl text-fg",
              )}
            >
              {line.text}
            </button>
          ) : (
            <span key={i} className="block">
              {line.text}
            </span>
          ),
        )}
      </pre>
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        highlight={shown ? { kind: "reach", oids: new Set([shown]) } : null}
        onCommitHover={setActive}
      />
    </figure>
  );
}
