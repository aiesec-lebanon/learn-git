import { SCHEMA_VERSION, STORAGE_KEY } from "@/features/progress/schema";

/**
 * Sets data-theme and data-motion on <html> from the stored preferences.
 * Self-contained: it is also serialized into the inline bootstrap script.
 */
export function applyDisplayPrefs(key: string, version: number): void {
  try {
    const root = document.documentElement;
    const doc = JSON.parse(localStorage.getItem(key) || "null");
    const prefs = doc && doc.v === version ? doc.prefs : null;
    const theme = prefs ? prefs.theme : null;
    const motion = prefs ? prefs.motion : null;
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    if (motion === "reduce") {
      root.setAttribute("data-motion", motion);
    } else {
      root.removeAttribute("data-motion");
    }
  } catch {
    // Storage blocked or unreadable: follow the system settings.
  }
}

export const bootstrapScript = `(${applyDisplayPrefs.toString()})(${JSON.stringify(STORAGE_KEY)},${SCHEMA_VERSION})`;
