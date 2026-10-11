import { walkCommits } from "./log/walk";
import { resolveHead } from "./refs/refs";
import type { ObjectPool, Oid, Repo } from "./types";

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

export type Reachability = {
  /** Reachable from a ref or HEAD. */
  readonly live: ReadonlySet<Oid>;
  /** Reachable from any reflog entry (what Git still keeps for a while). */
  readonly logged: ReadonlySet<Oid>;
};

const memo = new WeakMap<Repo, WeakMap<ObjectPool, Reachability>>();

/** Which commits refs, HEAD and reflogs still reach; memoized per snapshot. */
export function reachability(pool: ObjectPool, repo: Repo): Reachability {
  let byPool = memo.get(repo);
  if (!byPool) {
    byPool = new WeakMap();
    memo.set(repo, byPool);
  }
  let found = byPool.get(pool);
  if (!found) {
    const head = resolveHead(repo);
    found = {
      live: reachableFrom(pool, [
        ...repo.refs.values(),
        ...(head ? [head] : []),
      ]),
      logged: reachableFrom(
        pool,
        [...repo.reflogs.values()].flatMap((log) =>
          log
            .flatMap((e) => [e.old, e.new])
            .filter((o): o is Oid => o !== null),
        ),
      ),
    };
    byPool.set(pool, found);
  }
  return found;
}

/**
 * Commits only `from` reaches once HEAD moves to `to`: no ref and not the
 * new HEAD reach them. Newest first, as Git lists them when HEAD leaves.
 */
export function leftBehind(
  pool: ObjectPool,
  repo: Repo,
  from: Oid,
  to: Oid | null,
): Oid[] {
  const kept = reachableFrom(pool, [
    ...repo.refs.values(),
    ...(to ? [to] : []),
  ]);
  if (kept.has(from)) return [];
  const lost = (oid: Oid) => !kept.has(oid);
  return walkCommits(pool, [from], repo.arrival, Infinity, (oid, commit) => ({
    show: lost(oid),
    parents: commit.parents.filter(lost),
  })).map((c) => c.oid);
}
