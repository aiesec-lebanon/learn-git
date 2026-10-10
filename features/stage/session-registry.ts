import { LIMITS, type Session } from "@/engine";

/** Sandboxes by key, least recently used dropped first (they outlive hidden routes). */
export function createSessionRegistry(capacity: number = LIMITS.sandboxes) {
  const sessions = new Map<string, Session>();
  const touch = (key: string, session: Session) => {
    sessions.delete(key);
    sessions.set(key, session);
    for (const old of sessions.keys()) {
      if (sessions.size <= capacity) break;
      sessions.delete(old);
    }
    return session;
  };
  return {
    get(key: string, create: () => Session): Session {
      return touch(key, sessions.get(key) ?? create());
    },
    /** The most recently used sandbox ("Load my sandbox state"). */
    latest(): { key: string; session: Session } | null {
      const key = [...sessions.keys()].at(-1);
      const session = key === undefined ? undefined : sessions.get(key);
      return key === undefined || !session ? null : { key, session };
    },
    delete(key: string): void {
      sessions.delete(key);
    },
  };
}

export const sessions = createSessionRegistry();
