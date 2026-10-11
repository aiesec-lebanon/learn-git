"use client";

import { useMemo, useState } from "react";
import type { Oid, Session } from "@/engine";
import { CommitGraph, graphLayout } from "@/features/graph/graph";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { hubSide, twoRootsView } from "./hub-split.model";

const row =
  "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm border-2 border-line bg-surface px-2 text-left text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

/** The Hub's commit list beside your graph; picking a commit on either side finds it on the other (B6.1). */
export function HubSplit() {
  const session = useLessonSession();
  return session ? <HubSplitFor session={session} /> : null;
}

function HubSplitFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const [picked, setPicked] = useState<Oid | null>(null);
  const repo = view ? world.repos.get(view.id) : undefined;
  const hub = repo ? hubSide(world, repo) : null;
  if (!view || !layout) return null;
  const onHub = hub?.commits.find((c) => c.oid === picked);
  const local = view.commits.find((c) => c.oid === picked);
  const subject = onHub?.subject ?? local?.subject;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Pick a commit in the Hub&apos;s list or in your graph to find it on the
        other side.
      </figcaption>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="grid min-w-0 content-start gap-2">
          <h4 className="m-0 font-display text-sm font-bold">
            {hub ? (
              <>
                The Hub: <bdi>{hub.repo}</bdi>, {hub.branch}
              </>
            ) : (
              "The Hub"
            )}
          </h4>
          {hub ? (
            <ol className="m-0 grid list-none gap-1 p-0">
              {hub.commits.map((c) => (
                <li key={c.oid}>
                  <button
                    type="button"
                    aria-pressed={picked === c.oid}
                    onClick={() => setPicked(picked === c.oid ? null : c.oid)}
                    className={row}
                  >
                    <code className="font-mono">{c.short}</code>
                    <span className="min-w-0 truncate">{c.subject}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-sm text-fg-muted">
              Nothing to show yet: create the repository, connect it as origin
              and push.
            </p>
          )}
        </section>
        <section className="grid min-w-0 content-start gap-2">
          <h4 className="m-0 font-display text-sm font-bold">
            Your repository
          </h4>
          <CommitGraph
            view={view}
            layout={layout}
            label="Your repository"
            highlight={
              picked ? { kind: "reach", oids: new Set([picked]) } : null
            }
            onCommitHover={(oid) => oid && setPicked(oid)}
          />
        </section>
      </div>
      <output className="grid min-h-11 content-center text-sm">
        {picked && subject
          ? `${subject}: ${onHub ? "on the Hub" : "not on the Hub"}, ${local ? "in your repository" : "not in your repository"}.`
          : "Nothing picked yet."}
      </output>
    </figure>
  );
}

/** Two commits with no parent in one repository: yours and the README the Hub made (B6.1). */
export function TwoRoots() {
  const view = useMemo(() => twoRootsView(), []);
  const layout = useMemo(() => graphLayout(view), [view]);
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        After fetching the draft: your three commits and the Hub&apos;s README
        commit. Neither line reaches the other, so there is no merge base.
      </figcaption>
      <CommitGraph view={view} layout={layout} label="Two root commits" />
    </figure>
  );
}
