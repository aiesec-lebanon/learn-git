"use client";

import { useMemo } from "react";
import { narrate, type Session } from "@/engine";
import { Area } from "./area";
import { useSession } from "./use-session";

/** Plain sentences for the latest run, generated from its effects. */
export function WhatHappened({ session }: { session: Session }) {
  const { latest } = useSession(session);
  const lines = useMemo(
    () =>
      latest.flatMap(
        (e) => narrate(e.outcome.effects, e.outcome.world).whatHappened,
      ),
    [latest],
  );
  return (
    <Area title="What happened">
      {lines.length ? (
        <ol className="m-0 grid list-none gap-1 p-0 text-sm">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          Run a command to see what it did.
        </p>
      )}
    </Area>
  );
}
