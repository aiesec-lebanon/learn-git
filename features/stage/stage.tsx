"use client";

import { useMemo } from "react";
import type { Session } from "@/engine";
import { useSessionAnnouncer } from "@/features/announcer/session-announcer";
import { stageFrame } from "./frame";
import { ActorTimeline } from "./multi-repo/actor-timeline";
import { StageBoundary } from "./stage-boundary";
import { StageView } from "./stage-view";
import { useSession } from "./use-session";

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
