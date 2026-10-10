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
