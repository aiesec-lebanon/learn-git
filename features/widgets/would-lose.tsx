"use client";

import type { Session } from "@/engine";
import { useLessonSession } from "@/features/lesson/lesson-session";
import { useSession } from "@/features/stage/use-session";
import { wouldLose } from "./counters.model";
import { WouldLoseView } from "./would-lose-view";

/** Lesson widget: what a forced push would cost, updated as you work (B5.3). */
export function WouldLose() {
  const session = useLessonSession();
  return session ? <WouldLoseFor session={session} /> : null;
}

function WouldLoseFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  return <WouldLoseView found={wouldLose(world)} />;
}
