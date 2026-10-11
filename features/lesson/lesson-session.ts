"use client";

import { useMemo } from "react";
import type { Session } from "@/engine";
import { sandboxFor } from "@/features/stage/session-registry";
import { useLessonSandbox } from "./lesson-sandbox";

/** The Your turn sandbox's session, for widgets that show or change its state. */
export function useLessonSession(): Session | null {
  const sandbox = useLessonSandbox();
  return useMemo(
    () => (sandbox ? sandboxFor(sandbox.sessionKey, sandbox.world) : null),
    [sandbox],
  );
}
