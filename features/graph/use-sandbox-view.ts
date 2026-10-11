"use client";

import { useMemo } from "react";
import type { Session } from "@/engine";
import { stageFiles } from "@/features/stage/files";
import { useSession } from "@/features/stage/use-session";
import { graphLayout } from "./graph";
import { repoView } from "./view-model";

/** The sandbox's world with its repository's graph view and layout (null without a repository). */
export function useSandboxView(session: Session) {
  const { world } = useSession(session);
  const view = useMemo(() => {
    const id = stageFiles(world).repo;
    const repo = id ? world.repos.get(id) : undefined;
    return repo ? repoView(world, repo) : null;
  }, [world]);
  const layout = useMemo(() => (view ? graphLayout(view) : null), [view]);
  return { world, view, layout };
}
