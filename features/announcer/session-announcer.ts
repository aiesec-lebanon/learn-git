"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import { announcementFor } from "./announcement";
import { useAnnounce } from "./announcer";

/** Speaks each run's summary, and Rewind's new step. */
export function useSessionAnnouncer(session: Session): void {
  const say = useAnnounce();
  const { latest, step } = useSession(session);
  const seen = useRef({ latest, step });
  useEffect(() => {
    const before = seen.current;
    seen.current = { latest, step };
    if (latest !== before.latest && latest.length) say(announcementFor(latest));
    else if (step < before.step) say(`Sandbox rewound to step ${step}.`);
  }, [latest, step, say]);
}
