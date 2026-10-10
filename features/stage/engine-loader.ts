let engine: Promise<typeof import("@/engine")> | null = null;

/** Loads the engine once, on first need (it is not in the page's first bundle). */
export function loadEngine(): Promise<typeof import("@/engine")> {
  engine ??= import("@/engine");
  return engine;
}
