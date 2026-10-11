import { reachableFrom } from "../reachability";
import { shortRefName } from "../refs/names";
import { upstreamOf } from "../refs/upstream";
import type { Machine, ObjectPool, Oid, RefName, Repo, World } from "../types";

/** A branch compared with its upstream. */
export type Tracking = {
  /** The upstream as Git names it, e.g. `origin/main`. */
  readonly upstream: string;
  /** The upstream is configured but its ref no longer exists. */
  readonly gone: boolean;
  readonly ahead: number;
  readonly behind: number;
};

/** Commits only `a` reaches and commits only `b` reaches. */
export function aheadBehind(
  pool: ObjectPool,
  a: Oid,
  b: Oid,
): { ahead: number; behind: number } {
  const mine = reachableFrom(pool, [a]);
  const theirs = reachableFrom(pool, [b]);
  let ahead = 0;
  for (const oid of mine) if (!theirs.has(oid)) ahead++;
  let behind = 0;
  for (const oid of theirs) if (!mine.has(oid)) behind++;
  return { ahead, behind };
}

/** How `branch` (a full ref) stands against its upstream; null without one or without commits. */
export function trackingOf(
  world: World,
  machine: Machine,
  repo: Repo,
  branch: RefName,
): Tracking | null {
  const upstream = upstreamOf(world, machine, repo, shortRefName(branch));
  const local = repo.refs.get(branch);
  if (!upstream || !local) return null;
  const name = shortRefName(upstream);
  const theirs = repo.refs.get(upstream);
  if (!theirs) return { upstream: name, gone: true, ahead: 0, behind: 0 };
  return {
    upstream: name,
    gone: false,
    ...aheadBehind(world.objects, local, theirs),
  };
}

/** The current branch against its upstream, as status reports it. */
export function headTracking(
  world: World,
  machine: Machine,
  repo: Repo,
): Tracking | null {
  return repo.head.kind === "symbolic"
    ? trackingOf(world, machine, repo, repo.head.ref)
    : null;
}

const commits = (n: number) => `${n} commit${n === 1 ? "" : "s"}`;

/**
 * The tracking paragraph of `git status` and `git switch`. Commit message
 * templates leave out the advice for diverged branches.
 */
export function trackingLines(t: Tracking, divergenceAdvice = true): string[] {
  const name = `'${t.upstream}'`;
  if (t.gone) {
    return [
      `Your branch is based on ${name}, but the upstream is gone.`,
      '  (use "git branch --unset-upstream" to fixup)',
    ];
  }
  if (!t.ahead && !t.behind) return [`Your branch is up to date with ${name}.`];
  if (!t.behind) {
    return [
      `Your branch is ahead of ${name} by ${commits(t.ahead)}.`,
      '  (use "git push" to publish your local commits)',
    ];
  }
  if (!t.ahead) {
    return [
      `Your branch is behind ${name} by ${commits(t.behind)}, and can be fast-forwarded.`,
      '  (use "git pull" to update your local branch)',
    ];
  }
  return [
    `Your branch and ${name} have diverged,`,
    `and have ${t.ahead} and ${t.behind} different commits each, respectively.`,
    ...(divergenceAdvice
      ? [
          '  (use "git pull" if you want to integrate the remote branch with yours)',
        ]
      : []),
  ];
}

/** `ahead 1, behind 2`, `gone`, or empty when up to date. */
function counts(t: Tracking): string {
  if (t.gone) return "gone";
  return [
    ...(t.ahead ? [`ahead ${t.ahead}`] : []),
    ...(t.behind ? [`behind ${t.behind}`] : []),
  ].join(", ");
}

/** `git branch -v` (`[ahead 1]`) and `-vv` (`[origin/main: ahead 1]`) brackets; empty when nothing to say. */
export function trackingBrackets(t: Tracking, withName: boolean): string {
  const text = counts(t);
  if (!withName) return text ? `[${text}] ` : "";
  return `[${t.upstream}${text ? `: ${text}` : ""}] `;
}

/** The `## main...origin/main [ahead 1]` header of `git status -sb`. */
export function shortTrackingHeader(t: Tracking): string {
  const text = counts(t);
  return `...${t.upstream}${text ? ` [${text}]` : ""}`;
}
