"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@/engine";
import type { ScenarioScene } from "@/content/define";
import { seedLines } from "@/content/scenarios/acts";
import { useAnnounce } from "@/features/announcer/announcer";
import { HintLadder } from "@/features/guide/hint-ladder";
import { progressStore, useProgress } from "@/features/progress/progress";
import { useSession } from "@/features/stage/use-session";
import { Button } from "@/ui/button";
import { Debrief } from "./debrief";

/** Offers to re-seed the sandbox at the stored act (the previous contents are not kept). */
function PickUp({
  scene,
  session,
}: {
  scene: ScenarioScene;
  session: Session;
}) {
  const { resume } = useProgress();
  const { history } = useSession(session);
  const step =
    resume?.kind === "scenario" && resume.id === scene.id
      ? Math.min(resume.step, scene.acts.length)
      : 0;
  if (step === 0 || history.length) return null;
  return (
    <Button
      onClick={() => {
        for (const line of seedLines(scene, step)) session.run(line);
      }}
    >
      Pick up after act {step} of {scene.acts.length}
    </Button>
  );
}

/** The acts, the current act's goal and hints, then the debrief (learning design 4). */
export function ScenarioPanel({
  scene,
  session,
  reached,
}: {
  scene: ScenarioScene;
  session: Session;
  reached: number;
}) {
  const say = useAnnounce();
  const { history } = useSession(session);
  const was = useRef(reached);
  useEffect(() => {
    const act = scene.acts[reached - 1];
    if (act && reached > was.current) {
      say(
        reached === scene.acts.length
          ? `Scenario complete: ${act.title}.`
          : `Act ${reached} done: ${act.title}.`,
      );
      progressStore().setResume({
        kind: "scenario",
        id: scene.id,
        step: reached,
      });
    }
    was.current = reached;
  }, [reached, scene, say]);
  const current = scene.acts[reached];

  return (
    <div className="grid content-start gap-3">
      <ol className="m-0 grid list-none gap-1 p-0" aria-label="Acts">
        {scene.acts.map((act, i) => (
          <li
            key={act.id}
            aria-current={i === reached ? "step" : undefined}
            className="flex items-baseline gap-2 text-sm aria-[current=step]:font-semibold"
          >
            <span className="font-display text-fg-muted">Act {i + 1}</span>
            <span>{act.title}</span>
            {i < reached ? (
              <span className="text-accent-ink">· done</span>
            ) : null}
          </li>
        ))}
      </ol>
      {current ? (
        <>
          <p className="m-0 font-display text-lg">{current.goal}</p>
          {current.hints ? (
            <HintLadder
              key={current.id}
              session={session}
              hints={current.hints}
            />
          ) : null}
          <PickUp scene={scene} session={session} />
        </>
      ) : (
        <Debrief scene={scene} history={history} />
      )}
    </div>
  );
}
