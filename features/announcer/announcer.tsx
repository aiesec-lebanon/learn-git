"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import { announcementFor } from "./announcement";
import { createAnnouncerQueue } from "./queue";

const Say = createContext<(message: string) => void>(() => {});

/** The page's single polite live region; everything spoken goes through it. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("");
  const [queue] = useState(() => createAnnouncerQueue(setText));
  useEffect(() => () => queue.dispose(), [queue]);
  return (
    <Say value={queue.say}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {text}
      </div>
    </Say>
  );
}

export const useAnnounce = () => useContext(Say);

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
