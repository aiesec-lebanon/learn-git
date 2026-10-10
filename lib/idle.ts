/** Runs `callback` when the browser is idle, or after `timeout` ms at the latest. */
export function onIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(callback, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, Math.min(timeout, 200));
  return () => clearTimeout(id);
}
