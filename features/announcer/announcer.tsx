"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
