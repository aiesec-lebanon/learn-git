"use client";

import { useState } from "react";
import type { Oid, Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-session";
import { cx } from "@/lib/cx";
import { pullSync, type PlacedCommit } from "./pull-sync.model";

const row =
  "grid min-h-11 w-full cursor-pointer gap-1 rounded-sm border-2 border-line bg-surface px-2 py-1 text-left text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

function Place({ label, here }: { label: string; here: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill border-2 px-2 text-xs font-semibold",
        here
          ? "border-accent bg-accent-soft"
          : "border-dashed border-line-strong text-fg-muted",
      )}
    >
      {here ? label : `not ${label}`}
    </span>
  );
}

function CommitRow({
  commit,
  picked,
  onPick,
}: {
  commit: PlacedCommit;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className={row}
    >
      <span className="min-w-0 truncate">
        <code className="font-mono">{commit.short}</code> {commit.subject}
      </span>
      <span className="flex flex-wrap gap-1">
        <Place label="in your repository" here={commit.local} />
        <Place label="on origin" here={commit.origin} />
      </span>
    </button>
  );
}

/** The pull request's commits, where each one exists, and your graph lit to match (B6.2). */
export function PullSync() {
  const session = useLessonSession();
  return session ? <PullSyncFor session={session} /> : null;
}

function PullSyncFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const [picked, setPicked] = useState<Oid | null>(null);
  const repo = view ? world.repos.get(view.id) : undefined;
  const sync = repo ? pullSync(world, repo) : null;
  if (!view || !layout) return null;
  const commits = sync?.commits ?? [];
  const shown = commits.some((c) => c.oid === picked) ? picked : null;
  const lit = shown ? [shown] : commits.map((c) => c.oid);
  const mergeOnly =
    sync?.pull?.state === "merged" && commits[0] && !commits[0].local
      ? commits[0]
      : null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Where does each commit of the pull request exist? Pick one to find it in
        your graph.
      </figcaption>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="grid min-w-0 content-start gap-2">
          <h4 className="m-0 font-display text-sm font-bold">
            {sync?.pull ? (
              <>
                #{sync.pull.number} <bdi>{sync.pull.title}</bdi> (
                {sync.pull.state}, <bdi>{sync.pull.base}</bdi> ←{" "}
                <bdi>{sync.pull.head}</bdi>)
              </>
            ) : (
              "No pull request yet"
            )}
          </h4>
          {commits.length ? (
            <ol className="m-0 grid list-none gap-1 p-0">
              {commits.map((c) => (
                <li key={c.oid}>
                  <CommitRow
                    commit={c}
                    picked={shown === c.oid}
                    onPick={() => setPicked(shown === c.oid ? null : c.oid)}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-sm text-fg-muted">
              Push a branch and open a pull request on the Hub; its commits show
              here.
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
              lit.length ? { kind: "reach", oids: new Set(lit) } : null
            }
            onCommitHover={(oid) => oid && setPicked(oid)}
          />
        </section>
      </div>
      <output className="grid min-h-11 content-center text-sm">
        {mergeOnly
          ? `The merge commit ${mergeOnly.short} is on origin only. git pull on main brings it into your repository.`
          : sync?.pull?.state === "merged"
            ? "Merged, and the merge commit is in your repository too."
            : ""}
      </output>
    </figure>
  );
}
