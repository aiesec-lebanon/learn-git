"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Session, WorldSpec } from "@/engine";
import { sandboxFor } from "@/features/stage/session-registry";

/** The lesson's Your turn sandbox, which widgets in the prose may run commands in. */
export type LessonSandbox = {
  readonly sessionKey: string;
  readonly world: WorldSpec;
};

const Context = createContext<LessonSandbox | null>(null);

export function LessonSandboxProvider({
  value,
  children,
}: {
  value: LessonSandbox;
  children: ReactNode;
}) {
  return <Context value={value}>{children}</Context>;
}

export const useLessonSandbox = () => useContext(Context);

/** The Your turn sandbox's session, for widgets that show or change its state. */
export function useLessonSession(): Session | null {
  const sandbox = useLessonSandbox();
  return useMemo(
    () => (sandbox ? sandboxFor(sandbox.sessionKey, sandbox.world) : null),
    [sandbox],
  );
}
