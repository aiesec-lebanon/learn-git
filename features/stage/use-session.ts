"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Session, SessionSnapshot } from "@/engine";

export function useSession(session: Session): SessionSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => session.subscribe(listener),
    [session],
  );
  const snapshot = useCallback(() => session.getSnapshot(), [session]);
  const initial = useCallback(() => session.getInitialSnapshot(), [session]);
  return useSyncExternalStore(subscribe, snapshot, initial);
}
