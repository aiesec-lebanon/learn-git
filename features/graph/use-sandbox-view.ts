"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Session } from "@/engine";
import { stageFiles } from "@/features/stage/files";
import { useSession } from "@/features/stage/use-session";
import { graphLayout } from "./graph";
import { repoView } from "./view-model";

const never = () => () => {};

/**
 * The sandbox's world with its repository's graph view and layout: null
 * without a repository, and before hydration so no tap lands on a dead control.
 */
export function useSandboxView(session: Session) {
  const { world } = useSession(session);
  const view = useMemo(() => {
    const id = stageFiles(world).repo;
    const repo = id ? world.repos.get(id) : undefined;
    return repo ? repoView(world, repo) : null;
  }, [world]);
  const layout = useMemo(() => (view ? graphLayout(view) : null), [view]);
  const hydrated = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  return hydrated
    ? { world, view, layout }
    : { world, view: null, layout: null };
}
