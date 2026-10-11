"use client";

import { useState } from "react";
import type { Oid, Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-session";
import { parentLines } from "./three-way-view.model";

/** Point at or focus a commit to list its parents in order; HEAD's by default (B4.2). */
export function ParentInspector() {
  const session = useLessonSession();
  return session ? <ParentsFor session={session} /> : null;
}

function ParentsFor({ session }: { session: Session }) {
  const { view, layout } = useSandboxView(session);
  const [pointed, setPointed] = useState<Oid | null>(null);
  if (!view || !layout) return null;
  const oid = pointed ?? view.head.target;
  const commit = view.commits.find((c) => c.oid === oid);
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Point at or focus a commit to see its parents. Without one, HEAD&apos;s
        commit is shown.
      </figcaption>
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        onCommitHover={setPointed}
        highlight={
          commit
            ? { kind: "reach", oids: new Set([commit.oid, ...commit.parents]) }
            : null
        }
      />
      <output className="grid min-h-11 content-center gap-1 text-sm">
        {commit
          ? parentLines(view, commit).map((line) => (
              <span key={line}>{line}</span>
            ))
          : "No commits yet."}
      </output>
    </figure>
  );
}
