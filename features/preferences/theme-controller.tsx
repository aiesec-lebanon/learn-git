"use client";

import { useLayoutEffect } from "react";
import { SCHEMA_VERSION, STORAGE_KEY } from "@/features/progress/schema";
import { applyDisplayPrefs } from "./bootstrap";

/** Re-applies the bootstrap attributes after React's development remount clears them. */
export function ThemeController() {
  useLayoutEffect(() => applyDisplayPrefs(STORAGE_KEY, SCHEMA_VERSION), []);
  return null;
}
