"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { describeGraph, type Session } from "@/engine";
import { useSessionAnnouncer } from "@/features/announcer/announcer";
import { CommitGraph, graphLayout } from "@/features/graph/graph";
import { repoView } from "@/features/graph/view-model";
import { motionTokens, useMotion } from "@/features/motion/policy";
import { Area } from "./area";
import { Annotations, annotate } from "./choreography/annotations";
import { planChoreography, type GraphFrame } from "./choreography/plan";
import { playChoreography, type Timeline } from "./choreography/runner";
import { FileCard } from "./file-card";
import { stageFiles, type FileCard as Card } from "./files";
import { StageBoundary } from "./stage-boundary";
import { useSession } from "./use-session";

function FileList({
  files,
  area,
  empty,
}: {
  files: readonly Card[];
  area: "worktree" | "index";
  empty: string;
}) {
  if (!files.length)
    return <p className="m-0 text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {files.map((f) => (
        <FileCard key={`${f.path}:${f.state}`} file={f} area={area} />
      ))}
    </ul>
  );
}

function StageAreas({ session }: { session: Session }) {
  const { world, latest } = useSession(session);
  useSessionAnnouncer(session);
  const motion = useMotion();
  const files = useMemo(() => stageFiles(world), [world]);
  const repo = files.repo ? world.repos.get(files.repo) : undefined;
  const view = useMemo(
    () => (repo ? repoView(world, repo) : null),
    [world, repo],
  );
  const frame = useMemo<GraphFrame | null>(
    () => (view ? { layout: graphLayout(view), head: view.head.target } : null),
    [view],
  );
  const effects = useMemo(
    () => latest.flatMap((e) => e.outcome.effects),
    [latest],
  );
  const root = useRef<HTMLDivElement>(null);
  const shown = useRef<GraphFrame | null>(null);
  const timeline = useRef<Timeline | null>(null);
  const played = useRef(effects);

  useLayoutEffect(() => {
    timeline.current?.finish();
    timeline.current = null;
    const fresh = played.current !== effects;
    played.current = effects;
    if (fresh && motion === "full" && effects.length && root.current) {
      const steps = planChoreography(
        { effects, before: shown.current, after: frame, root: files.root },
        motionTokens,
      );
      timeline.current = playChoreography(root.current, steps);
    }
    shown.current = frame;
  }, [effects, frame, files.root, motion]);

  useLayoutEffect(() => () => timeline.current?.finish(), []);

  return (
    <div ref={root} className="grid gap-4">
      {motion === "reduce" ? (
        <Annotations notes={annotate(effects, world, files.root)} />
      ) : null}
      <Area title="Repository" hint={repo ? "inside .git" : undefined}>
        {view && frame && repo ? (
          <CommitGraph
            view={view}
            layout={frame.layout}
            label="Repository"
            describe={() => describeGraph(world, repo.id)}
          />
        ) : (
          <p className="m-0 text-sm text-fg-muted">
            No repository here yet. <code>git init</code> creates one.
          </p>
        )}
      </Area>
      <div className="grid gap-4 sm:grid-cols-2">
        <Area title="Working tree" hint="your files">
          <FileList files={files.worktree} area="worktree" empty="No files." />
        </Area>
        <Area title="Staging area" hint="the next commit">
          {files.index === null ? (
            <p className="m-0 text-sm text-fg-muted">
              Appears with the repository.
            </p>
          ) : (
            <FileList files={files.index} area="index" empty="Empty." />
          )}
        </Area>
      </div>
    </div>
  );
}

/** The three-area stage for one sandbox session. */
export function Stage({ session }: { session: Session }) {
  return (
    <StageBoundary session={session}>
      <StageAreas session={session} />
    </StageBoundary>
  );
}
