import { reachableFrom } from "../reachability";
import type { ObjectPool, Oid } from "../types";

const memo = new WeakMap<ObjectPool, Map<Oid, ReadonlySet<Oid>>>();

/** A commit and all its ancestors, memoized per object pool. */
export function ancestorsOf(pool: ObjectPool, oid: Oid): ReadonlySet<Oid> {
  let byOid = memo.get(pool);
  if (!byOid) {
    byOid = new Map();
    memo.set(pool, byOid);
  }
  let found = byOid.get(oid);
  if (!found) {
    found = reachableFrom(pool, [oid]);
    byOid.set(oid, found);
  }
  return found;
}

/**
 * The best common ancestors of two commits (`git merge-base --all`): the
 * shared ancestors that are not ancestors of another shared ancestor.
 */
export function mergeBases(pool: ObjectPool, a: Oid, b: Oid): Oid[] {
  const theirs = ancestorsOf(pool, b);
  const common = [...ancestorsOf(pool, a)].filter((oid) => theirs.has(oid));
  const parents = common.flatMap((oid) => {
    const commit = pool.get(oid);
    return commit?.type === "commit" ? commit.parents : [];
  });
  const older = reachableFrom(pool, parents);
  return common.filter((oid) => !older.has(oid));
}
