"use client";

import type { Session } from "@/engine";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { useSession } from "@/features/stage/use-session";
import { branchCounters, type CommitLine } from "./counters.model";

function Column({
  title,
  lines,
  empty,
}: {
  title: string;
  lines: readonly CommitLine[];
  empty: string;
}) {
  return (
    <div className="grid content-start gap-1">
      <h4 className="m-0 font-display text-sm font-bold">{title}</h4>
      {lines.length ? (
        <ul className="m-0 grid list-none gap-1 p-0 text-sm">
          {lines.map((c) => (
            <li key={c.oid} className="flex flex-wrap gap-x-2">
              <code>{c.short}</code>
              <bdi>{c.subject}</bdi>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-fg-muted">{empty}</p>
      )}
    </div>
  );
}

/** Ahead and behind as two lists: what a push would send, what a pull would bring (B5.3). */
export function Counters() {
  const session = useLessonSession();
  return session ? <CountersFor session={session} /> : null;
}

function CountersFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const counters = branchCounters(world);
  if (!counters) {
    return (
      <p className="m-0 rounded-sm border border-line bg-surface p-4 text-sm shadow-1">
        This branch has no upstream yet, so there is nothing to count.
      </p>
    );
  }
  const { branch, tracking, ahead, behind } = counters;
  const upstream = tracking.upstream;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        {tracking.gone
          ? `${upstream} is gone: the remote deleted that branch.`
          : `${branch} is ahead of ${upstream} by ${ahead.length} and behind it by ${behind.length}, counted from your last contact with the remote.`}
      </figcaption>
      <div className="grid gap-4 sm:grid-cols-2">
        <Column
          title={`Ahead: only on ${branch} (a push sends these)`}
          lines={ahead}
          empty="Nothing to push."
        />
        <Column
          title={`Behind: only on ${upstream} (a pull brings these)`}
          lines={behind}
          empty="Nothing to pull, as far as your clone knows."
        />
      </div>
    </figure>
  );
}
