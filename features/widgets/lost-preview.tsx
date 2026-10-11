"use client";

import { useState } from "react";
import type { Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { lostIfDeleted } from "@/features/graph/reach";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";

const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 font-mono text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

/** Pick a branch to see which commits deleting it would leave unreachable (B3.2). */
export function LostPreview() {
  const session = useLessonSession();
  return session ? <LostPreviewFor session={session} /> : null;
}

function LostPreviewFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const [branch, setBranch] = useState<string | null>(null);
  if (!view || !layout) return null;
  const current = view.head.kind === "branch" ? view.head.branch : null;
  const others = view.labels.filter(
    (l) => l.kind === "branch" && l.name !== current,
  );
  const picked = others.some((l) => l.name === branch) ? branch : null;
  const lost = picked ? lostIfDeleted(world, view, picked) : [];
  const n = lost.length;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Pick a branch to see what deleting it would cost. Nothing runs.
      </figcaption>
      {others.length ? (
        <div className="flex flex-wrap gap-2">
          {others.map((l) => (
            <button
              key={l.ref}
              type="button"
              aria-pressed={picked === l.name}
              onClick={() => setBranch(picked === l.name ? null : l.name)}
              className={chip}
            >
              <bdi>{l.name}</bdi>
            </button>
          ))}
        </div>
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          Only the branch HEAD is on exists, and Git never deletes that one.
        </p>
      )}
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        highlight={
          picked
            ? { kind: "lost", oids: new Set(lost.map((c) => c.oid)) }
            : null
        }
      />
      <output className="grid min-h-11 content-center text-sm">
        {!picked
          ? "No branch picked."
          : n === 0
            ? `git branch -d ${picked} removes only the label: another label still reaches every commit.`
            : `git branch -d ${picked} refuses: ${n} commit${n === 1 ? "" : "s"} (${lost.map((c) => c.short).join(", ")}) would become unreachable. -D deletes it anyway.`}
      </output>
    </figure>
  );
}
