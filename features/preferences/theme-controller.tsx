"use client";

import { useLayoutEffect } from "react";
import { progressStore } from "@/features/progress/progress";
import type { Prefs } from "@/features/progress/schema";

/** The display attributes for the learner's theme and motion choices. */
export function applyDisplay({
  theme,
  motion,
}: Pick<Prefs, "theme" | "motion">) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  if (motion === "reduce") root.setAttribute("data-motion", motion);
  else root.removeAttribute("data-motion");
}

/**
 * Keeps <html> in step with the stored preferences: after React's development
 * remount, after a change in Settings and after a change in another tab.
 */
export function ThemeController() {
  useLayoutEffect(() => {
    const store = progressStore();
    const apply = () => applyDisplay(store.getSnapshot().prefs);
    apply();
    return store.subscribe(apply);
  }, []);
  return null;
}
