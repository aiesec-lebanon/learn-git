"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { Session } from "@/engine";
import { useSessionAnnouncer } from "@/features/announcer/announcer";
import { CommitGraph, graphLayout } from "@/features/graph/graph";
import type { Layout } from "@/features/graph/layout";
import { motionTokens, useMotion } from "@/features/motion/policy";
import { Area } from "./area";
import { Annotations } from "./choreography/annotations";
import { planChoreography, type GraphFrame } from "./choreography/plan";
import { playChoreography, type Timeline } from "./choreography/runner";
import { FileCard } from "./file-card";
import { ActorTimeline } from "./multi-repo/actor-timeline";
import { RepoPanels } from "./multi-repo/panels";
import { planTransfers, type ScopedGraph } from "./multi-repo/transfer";
import type { FileCard as Card } from "./files";
import { stageFrame, type StageFrame } from "./frame";
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

/** The stage for one frame; it animates the frame's effects when `animate` is on. */
export function StageView({
  frame,
  animate = true,
  at,
}: {
  frame: StageFrame;
  animate?: boolean;
  /** Holds the animation at this point (0 to 1) instead of playing it. */
  at?: number;
}) {
  const motion = useMotion();
  const { files, view, panels } = frame;
  const graph = useMemo<GraphFrame | null>(
    () => (view ? { layout: graphLayout(view), head: view.head.target } : null),
    [view],
  );
  const panelLayouts = useMemo(
    () => new Map(panels.map((p) => [p.id, graphLayout(p.view)])),
    [panels],
  );
  const root = useRef<HTMLDivElement>(null);
  const shown = useRef<GraphFrame | null>(null);
  const shownPanels = useRef<ReadonlyMap<string, Layout>>(new Map());
  const timeline = useRef<Timeline | null>(null);
  const played = useRef(frame);

  useLayoutEffect(() => {
    timeline.current?.finish();
    timeline.current = null;
    const fresh = played.current !== frame;
    played.current = frame;
    if (
      fresh &&
      animate &&
      motion === "full" &&
      frame.effects.length &&
      root.current
    ) {
      const main = view?.id ?? null;
      const local = planChoreography(
        {
          effects: frame.effects.filter(
            (e) => !("repo" in e) || e.repo === main,
          ),
          before: shown.current,
          after: graph,
          root: files.root,
        },
        motionTokens,
      );
      const graphs = new Map<string, ScopedGraph>(
        panels.map((p) => [
          p.id,
          {
            scope: p.scope,
            before: shownPanels.current.get(p.id) ?? null,
            after: panelLayouts.get(p.id) ?? null,
          },
        ]),
      );
      if (main) {
        graphs.set(main, {
          scope: "",
          before: shown.current?.layout ?? null,
          after: graph?.layout ?? null,
        });
      }
      const end = Math.max(0, ...local.map((s) => s.delay + s.duration));
      const network = planTransfers(
        frame.effects,
        graphs,
        main,
        end,
        motionTokens,
      );
      timeline.current = playChoreography(root.current, [...local, ...network]);
    }
    shown.current = graph;
    shownPanels.current = panelLayouts;
  }, [frame, graph, files.root, animate, motion, panels, panelLayouts, view]);

  useLayoutEffect(() => {
    const t = timeline.current;
    if (at === undefined || !t) return;
    t.pause();
    t.seek(at * t.duration);
  }, [at, frame]);

  useLayoutEffect(() => () => timeline.current?.finish(), []);

  return (
    <div ref={root} className="grid gap-4">
      {motion === "reduce" ? <Annotations notes={frame.notes} /> : null}
      <RepoPanels panels={panels} layouts={panelLayouts} />
      <Area
        title="Repository"
        hint={
          view
            ? panels.length
              ? "your clone, inside .git"
              : "inside .git"
            : undefined
        }
      >
        {view && graph ? (
          <CommitGraph
            view={view}
            layout={graph.layout}
            label="Repository"
            describe={() => frame.description ?? ""}
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

function SessionStage({ session }: { session: Session }) {
  const { world, latest } = useSession(session);
  useSessionAnnouncer(session);
  const frame = useMemo(
    () =>
      stageFrame(
        world,
        latest.flatMap((e) => e.outcome.effects),
      ),
    [world, latest],
  );
  return (
    <div className="grid gap-4">
      <StageView frame={frame} />
      <ActorTimeline session={session} />
    </div>
  );
}

/** The three-area stage for one sandbox session. */
export function Stage({ session }: { session: Session }) {
  return (
    <StageBoundary session={session}>
      <SessionStage session={session} />
    </StageBoundary>
  );
}
