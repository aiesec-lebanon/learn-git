"use client";

import { useMemo } from "react";
import type { Session, World } from "@/engine";
import type { ScenarioScene } from "@/content/define";
import { actsReached } from "@/content/scenarios/acts";
import { useSession } from "@/features/stage/use-session";

const counted = new WeakMap<ScenarioScene, WeakMap<World, number>>();

function reachedIn(scene: ScenarioScene, world: World): number {
  let worlds = counted.get(scene);
  if (!worlds) counted.set(scene, (worlds = new WeakMap()));
  let n = worlds.get(world);
  if (n === undefined) worlds.set(world, (n = actsReached(scene, world)));
  return n;
}

/** Acts reached anywhere along the session's history; Rewind takes them back. */
export function useActsReached(
  scene: ScenarioScene | undefined,
  session: Session,
): number {
  const { world, history } = useSession(session);
  return useMemo(
    () =>
      scene
        ? Math.max(
            reachedIn(scene, world),
            ...history.map((e) => reachedIn(scene, e.outcome.world)),
          )
        : 0,
    [scene, world, history],
  );
}
