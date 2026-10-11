"use client";

import { useMemo, useState } from "react";
import type { Session } from "@/engine";
import { CommitGraph, graphLayout } from "@/features/graph/graph";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { useSession } from "@/features/stage/use-session";
import { Button } from "@/ui/button";
import {
  fetchVsPull,
  PULL_MODES,
  pullModes,
  type Preview,
} from "./fetch-vs-pull.model";

const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 text-sm font-semibold aria-pressed:border-accent aria-pressed:bg-accent-soft";

function PreviewCard({ preview, title }: { preview: Preview; title: string }) {
  const layout = useMemo(
    () => (preview.view ? graphLayout(preview.view) : null),
    [preview.view],
  );
  return (
    <section className="grid min-w-0 content-start gap-2">
      <h4 className="m-0 font-display text-sm font-bold">
        {title}: <code>{preview.command}</code>
      </h4>
      {preview.view && layout ? (
        <CommitGraph view={preview.view} layout={layout} label={title} />
      ) : null}
      <output className="text-sm">{preview.outcome}</output>
    </section>
  );
}

/** The comparator: what `git fetch` and `git pull` would each do from here (B5.2). */
export function FetchVsPull() {
  const session = useLessonSession();
  return session ? <FetchVsPullFor session={session} /> : null;
}

function FetchVsPullFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const [fetch, pull] = useMemo(() => fetchVsPull(world), [world]);
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        One starting point, two commands. Nothing runs until you type it.
      </figcaption>
      <div className="grid gap-4 md:grid-cols-2">
        <PreviewCard preview={fetch} title="Fetch" />
        <PreviewCard preview={pull} title="Pull" />
      </div>
    </figure>
  );
}

/** The pull-mode chooser: merge, rebase or fast-forward only, previewed, then run. */
export function PullMode() {
  const session = useLessonSession();
  return session ? <PullModeFor session={session} /> : null;
}

function PullModeFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const previews = useMemo(() => pullModes(world), [world]);
  const [picked, setPicked] = useState(0);
  const shown = previews[picked];
  const mode = PULL_MODES[picked];
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Pick how <code>git pull</code> combines your work with origin&apos;s.
      </figcaption>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pull mode">
        {PULL_MODES.map((m, i) => (
          <button
            key={m.command}
            type="button"
            aria-pressed={i === picked}
            onClick={() => setPicked(i)}
            className={chip}
          >
            {m.label}
          </button>
        ))}
      </div>
      {shown && mode ? (
        <>
          <PreviewCard preview={shown} title={mode.label} />
          <div>
            <Button variant="primary" onClick={() => session.run(mode.command)}>
              Run <code>{mode.command}</code>
            </Button>
          </div>
        </>
      ) : null}
    </figure>
  );
}
