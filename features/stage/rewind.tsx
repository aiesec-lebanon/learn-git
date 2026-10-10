"use client";

import type { Session } from "@/engine";
import { useSession } from "./use-session";

/** Steps the sandbox back one command; a simulator control, not a Git command. */
export function Rewind({ session }: { session: Session }) {
  const { step, floor } = useSession(session);
  const atFloor = step <= floor;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => session.rewindTo(step - 1)}
        disabled={atFloor}
        className="min-h-11 rounded-sm border border-line-strong bg-surface px-3 font-medium hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
      >
        Rewind sandbox{" "}
        <span className="text-fg-muted">(not a Git feature)</span>
      </button>
      <span className="text-fg-muted">
        {step === 0
          ? "Nothing to rewind yet."
          : atFloor
            ? `Step ${step}: older steps are no longer kept.`
            : `Step ${step}`}
      </span>
    </div>
  );
}
