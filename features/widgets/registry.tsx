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
  "diff-anatomy": lazy(() =>
    import("./diff-anatomy").then((m) => ({ default: m.DiffAnatomy })),
  ),
  "diff-lens": lazy(() =>
    import("./diff-lens").then((m) => ({ default: m.DiffLens })),
  ),
  "restore-picker": lazy(() =>
    import("./restore-picker").then((m) => ({ default: m.RestorePicker })),
  ),
  "file-state-map": lazy(() =>
    import("./file-state-map").then((m) => ({ default: m.FileStateMap })),
  ),
  "pattern-lab": lazy(() =>
    import("./pattern-lab").then((m) => ({ default: m.PatternLab })),
  ),
  "pointer-drag": lazy(() =>
    import("@/features/graph/drag/pointer-drag").then((m) => ({
      default: m.PointerDrag,
    })),
  ),
  "pointer-preview": lazy(() =>
    import("@/features/graph/drag/pointer-drag").then((m) => ({
      default: m.PointerPreview,
    })),
  ),
  reachability: lazy(() =>
    import("@/features/graph/reachability").then((m) => ({
      default: m.ReachabilityHighlighter,
    })),
  ),
  "lost-preview": lazy(() =>
    import("./lost-preview").then((m) => ({ default: m.LostPreview })),
  ),
  "leave-preview": lazy(() =>
    import("./leave-preview").then((m) => ({ default: m.LeavePreview })),
  ),
  "destructive-preview": lazy(() =>
    import("./destructive-preview").then((m) => ({
      default: m.DestructivePreview,
    })),
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
