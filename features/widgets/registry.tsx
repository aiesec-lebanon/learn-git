"use client";

import { lazy, Suspense, type ComponentType } from "react";
import type { WidgetName } from "./names";

const WIDGETS: Record<WidgetName, ComponentType> = {
  "snapshot-scrubber": lazy(() =>
    import("./snapshot-scrubber").then((m) => ({
      default: m.SnapshotScrubber,
    })),
  ),
  "git-reveal": lazy(() =>
    import("./git-reveal").then((m) => ({ default: m.GitReveal })),
  ),
  "identity-form": lazy(() =>
    import("./identity-form").then((m) => ({ default: m.IdentityForm })),
  ),
  "stage-files": lazy(() =>
    import("./stage-files").then((m) => ({ default: m.StageFiles })),
  ),
  "status-lens": lazy(() =>
    import("./status-lens").then((m) => ({ default: m.StatusLens })),
  ),
  "history-scrubber": lazy(() =>
    import("./history-scrubber").then((m) => ({ default: m.HistoryScrubber })),
  ),
  "hash-chain": lazy(() =>
    import("./hash-chain").then((m) => ({ default: m.HashChain })),
  ),
};

/** A lesson widget by name, loaded with its own code (R3). */
export function Widget({ name }: { name: string }) {
  const Found = WIDGETS[name as WidgetName];
  if (!Found) return null;
  return (
    <div className="my-5">
      <Suspense fallback={null}>
        <Found />
      </Suspense>
    </div>
  );
}
