"use client";

import { useState } from "react";
import type { Session } from "@/engine";
import { useLessonSession } from "@/features/lesson/lesson-session";
import { CommitGraph } from "./graph";
import { reachedFrom } from "./reach";
import { useSandboxView } from "./use-sandbox-view";

const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 font-mono text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

/** Point at a branch label to light up every commit it reaches (B3.1, B3.2). */
export function ReachabilityHighlighter() {
  const session = useLessonSession();
  return session ? <HighlighterFor session={session} /> : null;
}

function HighlighterFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const [name, setName] = useState<string | null>(null);
  if (!view || !layout) return null;
  const branches = view.labels.filter((l) => l.kind === "branch");
  const shown = branches.some((l) => l.name === name) ? name : null;
  const reached = shown ? reachedFrom(world, view, shown) : [];
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Point at a branch label, or focus one of these buttons, to light up
        every commit it reaches.
      </figcaption>
      <div className="flex flex-wrap gap-2">
        {branches.map((l) => (
          <button
            key={l.ref}
            type="button"
            aria-pressed={shown === l.name}
            onPointerEnter={() => setName(l.name)}
            onPointerLeave={() => setName(null)}
            onFocus={() => setName(l.name)}
            onBlur={() => setName(null)}
            onClick={() => setName(shown === l.name ? null : l.name)}
            className={chip}
          >
            <bdi>{l.name}</bdi>
          </button>
        ))}
      </div>
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        highlight={
          shown
            ? { kind: "reach", oids: new Set(reached.map((c) => c.oid)) }
            : null
        }
        onLabelHover={setName}
      />
      <output className="grid min-h-11 content-center text-sm">
        {shown
          ? `${shown} reaches ${reached.length} commit${reached.length === 1 ? "" : "s"}: ${reached.map((c) => c.short).join(", ")}.`
          : "Nothing lit up yet."}
      </output>
    </figure>
  );
}
