/** An item being carried and the drop target it points at (keyboard, pointer or tap). */
export type Carry<I, T> = { readonly item: I; readonly target: T | null };

export type CarryKey = "next" | "previous" | "drop" | "cancel";

/** Picking up aims at the first target, so a tap or Space then Enter drops there. */
export const pick = <I, T>(item: I, targets: readonly T[]): Carry<I, T> => ({
  item,
  target: targets[0] ?? null,
});

/** Aims at another target; the same object back when nothing changed. */
export const aim = <I, T>(carry: Carry<I, T>, target: T | null): Carry<I, T> =>
  carry.target === target ? carry : { ...carry, target };

/** The next or previous target, wrapping around. */
export function move<I, T>(
  carry: Carry<I, T>,
  targets: readonly T[],
  step: 1 | -1,
): Carry<I, T> {
  const n = targets.length;
  if (!n) return aim(carry, null);
  const at = carry.target === null ? -1 : targets.indexOf(carry.target);
  const next = at < 0 ? (step > 0 ? 0 : n - 1) : (at + step + n) % n;
  return aim(carry, targets[next] ?? null);
}

/** What a key does while carrying: arrows or Tab move, Enter drops, Escape cancels. */
export function carryKey(key: string, shift = false): CarryKey | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return "next";
    case "ArrowLeft":
    case "ArrowUp":
      return "previous";
    case "Tab":
      return shift ? "previous" : "next";
    case "Enter":
      return "drop";
    case "Escape":
      return "cancel";
    default:
      return null;
  }
}
