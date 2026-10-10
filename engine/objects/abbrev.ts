import type { ObjectPool, Oid } from "../types";

export const MIN_ABBREV = 7;

const sortedMemo = new WeakMap<ObjectPool, readonly string[]>();

function sortedIds(pool: ObjectPool): readonly string[] {
  let ids = sortedMemo.get(pool);
  if (!ids) {
    ids = [...pool.keys()].sort();
    sortedMemo.set(pool, ids);
  }
  return ids;
}

function commonPrefix(a: string, b: string | undefined): number {
  if (b === undefined) return 0;
  let n = 0;
  while (n < a.length && a[n] === b[n]) n++;
  return n;
}

/** Shortest unique prefix of at least 7 characters, as Git abbreviates IDs. */
export function abbreviate(pool: ObjectPool, oid: Oid): string {
  const ids = sortedIds(pool);
  let lo = 0;
  let hi = ids.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((ids[mid] ?? "") < oid) lo = mid + 1;
    else hi = mid;
  }
  const next = ids[lo] === oid ? ids[lo + 1] : ids[lo];
  const shared = Math.max(
    commonPrefix(oid, ids[lo - 1]),
    commonPrefix(oid, next),
  );
  return oid.slice(0, Math.max(MIN_ABBREV, shared + 1));
}
