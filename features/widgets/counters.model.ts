import {
  abbreviate,
  discoverRepo,
  hubName,
  machineOf,
  reachableFrom,
  resolveHead,
  shortRefName,
  subjectOf,
  trackingOf,
  type Commit,
  type Effect,
  type Oid,
  type Repo,
  type RefName,
  type Tracking,
  type World,
} from "@/engine";

export type CommitLine = {
  readonly oid: Oid;
  readonly short: string;
  readonly subject: string;
  readonly author: string;
};

export type Counters = {
  readonly branch: string;
  readonly tracking: Tracking;
  /** Commits only your branch has (what a push sends), newest first. */
  readonly ahead: readonly CommitLine[];
  /** Commits only the remote-tracking branch has (what a pull brings). */
  readonly behind: readonly CommitLine[];
};

function lines(world: World, from: Oid, without: Oid | null): CommitLine[] {
  const pool = world.objects;
  const kept = without ? reachableFrom(pool, [without]) : new Set<Oid>();
  const out: CommitLine[] = [];
  for (const oid of reachableFrom(pool, [from])) {
    if (kept.has(oid)) continue;
    const commit = pool.get(oid) as Commit;
    out.push({
      oid,
      short: abbreviate(pool, oid),
      subject: subjectOf(commit.message),
      author: commit.author.name,
    });
  }
  return out.sort(
    (a, b) =>
      (pool.get(b.oid) as Commit).committer.time -
      (pool.get(a.oid) as Commit).committer.time,
  );
}

/** The current branch against its upstream, as the counters show it; null without one. */
export function branchCounters(world: World): Counters | null {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  if (!repo || repo.head.kind !== "symbolic") return null;
  const ref = repo.head.ref;
  const tracking = trackingOf(world, machine, repo, ref);
  const mine = repo.refs.get(ref);
  if (!tracking || !mine) return null;
  const theirs = tracking.gone
    ? null
    : (repo.refs.get(`refs/remotes/${tracking.upstream}` as RefName) ?? null);
  return {
    branch: shortRefName(ref),
    tracking,
    ahead: lines(world, mine, theirs),
    behind: theirs ? lines(world, theirs, mine) : [],
  };
}

/** The Hub repository a remote of `repo` points at, if any. */
export function hostedFor(
  world: World,
  repo: Repo,
  remote: string,
): Repo | null {
  const url = repo.config.findLast(
    (e) => e.key === `remote.${remote}.url`,
  )?.value;
  const name = url ? hubName(url) : null;
  return (name && world.repos.get(`hub:/${name}.git`)) || null;
}

export type WouldLose = {
  readonly remote: string;
  readonly branch: string;
  /** Commits the remote branch has that a forced push of yours would drop. */
  readonly lost: readonly CommitLine[];
};

/**
 * What a forced push of the current branch would remove from the remote:
 * the remote branch's commits your branch does not reach (the sandbox
 * sees the Hub directly, even before you fetch).
 */
export function wouldLose(world: World): WouldLose | null {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  if (!repo || repo.head.kind !== "symbolic") return null;
  const branch = shortRefName(repo.head.ref);
  const merge = repo.config.findLast(
    (e) => e.key === `branch.${branch}.remote`,
  );
  const remote = merge?.value ?? "origin";
  const hosted = hostedFor(world, repo, remote);
  const theirs = hosted?.refs.get(repo.head.ref);
  const mine = resolveHead(repo);
  if (!theirs || !mine) return null;
  return { remote, branch, lost: lines(world, theirs, mine) };
}

/** Whether the latest command was a push the remote rejected. */
export const pushRejected = (effects: readonly Effect[]) =>
  effects.some((e) => e.kind === "refused" && e.code === "push-rejected");
