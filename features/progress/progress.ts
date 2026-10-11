"use client";

import { useSyncExternalStore } from "react";
import { CHAPTERS, readyLessons, readyScenarios } from "@/content/registry";
import { browserStorage } from "@/lib/storage";
import { STORAGE_KEY, type ProgressDoc } from "./schema";
import { createProgressStore, type ProgressStore } from "./store";

let store: ProgressStore | null = null;

/** The page's progress store; browser only (call it in effects, handlers or browser-only islands). */
export function progressStore(): ProgressStore {
  if (store) return store;
  const created = createProgressStore(browserStorage(), {
    lessons: readyLessons().map((l) => l.id),
    chapters: CHAPTERS.map((c) => c.id),
    scenarios: readyScenarios().map((s) => s.id),
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) created.receive(event.newValue);
    else if (event.key === null) created.receive(null);
  });
  store = created;
  return created;
}

/** Progress for components under `use(browser())`. */
export function useProgress(): ProgressDoc {
  const s = progressStore();
  return useSyncExternalStore(s.subscribe, s.getSnapshot, s.getSnapshot);
}
