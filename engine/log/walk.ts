import { readObject } from "../objects/pool";
import type { Commit, ObjectPool, Oid } from "../types";

export type WalkedCommit = { readonly oid: Oid; readonly commit: Commit };

/** Whether a walked commit is listed, and which parents the walk follows. */
export type WalkStep = {
  readonly show: boolean;
  readonly parents: readonly Oid[];
};

const everything = (_oid: Oid, commit: Commit): WalkStep => ({
  show: true,
  parents: commit.parents,
});

/**
 * Commits reachable from `starts`, newest committer date first; ties go
 * to the commit that arrived later (stable with the graph's arrival order).
 * `step` may hide commits and prune parents (history simplification).
 */
export function walkCommits(
  pool: ObjectPool,
  starts: readonly Oid[],
  arrival: readonly Oid[],
  limit = Infinity,
  step: (oid: Oid, commit: Commit) => WalkStep = everything,
): WalkedCommit[] {
  const rank = new Map(arrival.map((oid, i) => [oid, i]));
  const seen = new Set<Oid>(starts);
  const queue: WalkedCommit[] = starts.map((oid) => ({
    oid,
    commit: readObject(pool, oid, "commit"),
  }));
  const out: WalkedCommit[] = [];
  while (queue.length && out.length < limit) {
    queue.sort(
      (a, b) =>
        b.commit.committer.time - a.commit.committer.time ||
        (rank.get(b.oid) ?? -1) - (rank.get(a.oid) ?? -1),
    );
    const next = queue.shift();
    if (!next) break;
    const { show, parents } = step(next.oid, next.commit);
    if (show) out.push(next);
    for (const parent of parents) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      queue.push({ oid: parent, commit: readObject(pool, parent, "commit") });
    }
  }
  return out;
}
