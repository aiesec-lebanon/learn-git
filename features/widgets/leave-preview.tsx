"use client";

import type { Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { lostIfLeaving } from "@/features/graph/reach";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-session";

/** While HEAD is detached: the commits that become unreachable if you leave now (B3.3). */
export function LeavePreview() {
  const session = useLessonSession();
  return session ? <LeavePreviewFor session={session} /> : null;
}

function LeavePreviewFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  if (!view || !layout) return null;
  const lost = lostIfLeaving(world, view);
  const n = lost.length;
  const text =
    view.head.kind === "branch"
      ? `HEAD is on ${view.head.branch}, so leaving keeps every commit.`
      : n === 0
        ? "Leaving now loses nothing: a branch reaches every commit here."
        : `If you leave now, ${n} commit${n === 1 ? "" : "s"} (${lost.map((c) => c.short).join(", ")}) become${n === 1 ? "s" : ""} unreachable. Name ${n === 1 ? "it" : "them"} with git switch -c first to keep ${n === 1 ? "it" : "them"}.`;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        What leaving HEAD where it is would cost, updated as you work.
      </figcaption>
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        highlight={{ kind: "lost", oids: new Set(lost.map((c) => c.oid)) }}
      />
      <output className="grid min-h-11 content-center text-sm">{text}</output>
    </figure>
  );
}
