"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import type { Session } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import { cx } from "@/lib/cx";

const HubFrame = lazy(() =>
  import("./frame").then((m) => ({ default: m.HubFrame })),
);

const chip =
  "inline-flex min-h-11 cursor-pointer items-center rounded-sm border-2 border-line-strong bg-surface px-3 text-sm font-semibold aria-pressed:border-accent aria-pressed:bg-accent-soft";

/**
 * The stage, and the Hub when the world has one (its code loads only then).
 * On phones one of them shows at a time, picked with two pressed buttons.
 */
export function StageAndHub({
  session,
  stage,
}: {
  session: Session;
  stage: ReactNode;
}) {
  const { world } = useSession(session);
  const [showHub, setShowHub] = useState(false);
  if (!world.hub) return stage;
  return (
    <div className="grid gap-4">
      <div
        role="group"
        aria-label="Show on this screen"
        className="flex gap-2 md:hidden"
      >
        <button
          type="button"
          aria-pressed={!showHub}
          onClick={() => setShowHub(false)}
          className={chip}
        >
          Your repositories
        </button>
        <button
          type="button"
          aria-pressed={showHub}
          onClick={() => setShowHub(true)}
          className={chip}
        >
          The Hub
        </button>
      </div>
      <div className={cx(showHub && "max-md:hidden")}>{stage}</div>
      <div className={cx(!showHub && "max-md:hidden")}>
        <Suspense
          fallback={
            <p className="m-0 text-sm text-fg-muted">Opening the Hub…</p>
          }
        >
          <HubFrame session={session} />
        </Suspense>
      </div>
    </div>
  );
}
