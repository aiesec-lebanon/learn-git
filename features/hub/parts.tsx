import type { ReactNode } from "react";
import type { HubAction, Session, World } from "@/engine";
import { clockTime } from "@/features/graph/view-model";
import { cx } from "@/lib/cx";
import type { HubLocation } from "./location";

export type HubPageProps = {
  readonly world: World;
  readonly session: Session;
  readonly go: (at: HubLocation) => void;
};

/** A link inside the Hub: it navigates the simulated page, not the site. */
export function HubLink({
  to,
  go,
  children,
  className,
  current,
}: {
  to: HubLocation;
  go: (at: HubLocation) => void;
  children: ReactNode;
  className?: string;
  current?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => go(to)}
      aria-current={current ? "page" : undefined}
      className={cx(
        "cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-accent-ink underline decoration-1 underline-offset-2 hover:decoration-2",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** "at 00:12" on the simulated clock. */
export const at = (time: number) => `at ${clockTime(time)}`;

/**
 * Takes a Hub action as the learner; returns the Hub's refusal message, or
 * null when it went through (the announcer speaks either way).
 */
export function actOn(session: Session, action: HubAction): string | null {
  const [entry] = session.act(action);
  const out = entry?.outcome.output;
  return out && out.exitCode !== 0 ? out.stderr.trim() : null;
}

/** A refusal shown next to the form that caused it. */
export function Refusal({
  id,
  message,
}: {
  id: string;
  message: string | null;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="m-0 rounded-xs bg-st-deleted-bg px-2 py-1 text-sm font-semibold text-st-deleted"
    >
      {message}
    </p>
  );
}

export const field =
  "min-h-11 w-full rounded-sm border-2 border-line-strong bg-surface px-3 text-base text-fg";
