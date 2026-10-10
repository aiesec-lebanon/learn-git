export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** `localStorage`, or null where the browser blocks it (even reading the property can throw). */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
