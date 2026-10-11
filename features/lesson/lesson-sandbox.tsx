"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WorldSpec } from "@/engine";

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
