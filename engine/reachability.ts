import type { ObjectPool, Oid } from "./types";

/** Every commit reachable from `starts` through parent links. */
export function reachableFrom(
  pool: ObjectPool,
  starts: Iterable<Oid>,
): Set<Oid> {
  const seen = new Set<Oid>();
  const stack = [...starts];
  for (let oid = stack.pop(); oid; oid = stack.pop()) {
    if (seen.has(oid)) continue;
    const commit = pool.get(oid);
    if (commit?.type !== "commit") continue;
    seen.add(oid);
    stack.push(...commit.parents);
  }
  return seen;
}

/** Whether `ancestor` is `descendant` or one of its ancestors. */
export function isAncestor(
  pool: ObjectPool,
  ancestor: Oid,
  descendant: Oid,
): boolean {
  return reachableFrom(pool, [descendant]).has(ancestor);
}
