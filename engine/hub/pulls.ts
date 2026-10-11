import { subjectOf } from "../commit/message";
import { walkCommits } from "../log/walk";
import { ancestorsOf, mergeBases } from "../merge/base";
import { branchRef } from "../refs/names";
import type { HostedRepo, HubAction, Oid, PullRequest, World } from "../types";
import { repoOf } from "../world/access";
import { diffCommits, type FileDiffView } from "./diff";
import { closingIssues } from "./keywords";
import { dryMerge } from "./mergeability";
import {
  refuseHub,
  textProblem,
  type HubContext,
  type HubResult,
} from "./result";
import { hostedRepo, nextNumber, withHosted } from "./state";
import { defaultBranch, type CommitView } from "./views";

export type Mergeability =
  | { readonly kind: "clean" }
  | { readonly kind: "conflicts"; readonly paths: readonly string[] };

/** base ← head: what merging would bring, from the merge base (a three-dot diff). */
export type CompareView = {
  readonly base: Oid;
  readonly head: Oid;
  readonly mergeBase: Oid;
  /** Commits on head that base lacks, oldest first. */
  readonly commits: readonly CommitView[];
  readonly files: readonly FileDiffView[];
  readonly mergeable: Mergeability;
};

export type CompareResult =
  | { readonly ok: true; readonly view: CompareView }
  | { readonly ok: false; readonly message: string };

/** Compares two commits of a hosted repository (the base side first). */
export function compareCommits(
  world: World,
  fullName: string,
  base: Oid,
  head: Oid,
): CompareView | null {
  const pool = world.objects;
  const [mergeBase] = mergeBases(pool, base, head);
  if (!mergeBase) return null;
  const inBase = ancestorsOf(pool, base);
  const { arrival } = repoOf(world, hostedRepo(world, fullName).repo);
  const commits = walkCommits(pool, [head], arrival)
    .filter(({ oid }) => !inBase.has(oid))
    .reverse()
    .map(({ oid, commit }) => ({
      oid,
      subject: subjectOf(commit.message),
      author: commit.author,
    }));
  const merged = dryMerge(pool, base, head);
  return {
    base,
    head,
    mergeBase,
    commits,
    files: diffCommits(pool, mergeBase, head),
    mergeable: merged.ok
      ? { kind: "clean" }
      : { kind: "conflicts", paths: merged.conflicts },
  };
}

/** Compares two branches, or says why they cannot make a pull request. */
export function compareBranches(
  world: World,
  fullName: string,
  base: string,
  head: string,
): CompareResult {
  const hosted = world.hub?.repos.get(fullName);
  if (!hosted)
    return { ok: false, message: `The Hub has no repository ${fullName}.` };
  const refs = repoOf(world, hosted.repo).refs;
  for (const name of [base, head]) {
    if (!refs.has(branchRef(name)))
      return { ok: false, message: `${fullName} has no branch named ${name}.` };
  }
  if (base === head)
    return { ok: false, message: "Pick two different branches to compare." };
  const view = compareCommits(
    world,
    fullName,
    refs.get(branchRef(base)) as Oid,
    refs.get(branchRef(head)) as Oid,
  );
  if (!view)
    return {
      ok: false,
      message: `${base} and ${head} share no history, so there is nothing to compare.`,
    };
  if (!view.commits.length)
    return {
      ok: false,
      message: `${base} already has every commit on ${head}.`,
    };
  return { ok: true, view };
}

/** The pull request with that number, or null. */
export function findPull(
  hosted: HostedRepo,
  number: number,
): PullRequest | null {
  return hosted.pulls.find((p) => p.number === number) ?? null;
}

export type LocatedPull =
  | {
      readonly ok: true;
      readonly hosted: HostedRepo;
      readonly pull: PullRequest;
    }
  | { readonly ok: false; readonly message: string };

/** A repository's pull request by number, or why there is none. */
export function locatePull(
  world: World,
  fullName: string,
  number: number,
): LocatedPull {
  const hosted = world.hub?.repos.get(fullName);
  if (!hosted)
    return { ok: false, message: `The Hub has no repository ${fullName}.` };
  const pull = findPull(hosted, number);
  return pull
    ? { ok: true, hosted, pull }
    : { ok: false, message: `${fullName} has no pull request #${number}.` };
}

/** The world with one pull request replaced. */
export function replacePull(
  world: World,
  hosted: HostedRepo,
  pull: PullRequest,
): World {
  return withHosted(world, {
    ...hosted,
    pulls: hosted.pulls.map((p) => (p.number === pull.number ? pull : p)),
  });
}

/** What the pull request proposes now (null when its branches no longer compare). */
export function pullCompare(
  world: World,
  fullName: string,
  pull: PullRequest,
): CompareView | null {
  if (pull.merged)
    return compareCommits(world, fullName, pull.merged.base, pull.merged.head);
  const { refs } = repoOf(world, hostedRepo(world, fullName).repo);
  const base = refs.get(branchRef(pull.base));
  const head = refs.get(branchRef(pull.head));
  return base && head ? compareCommits(world, fullName, base, head) : null;
}

/** Issue numbers the pull request would close: keywords count only into the default branch. */
export function closesIssues(
  world: World,
  fullName: string,
  pull: PullRequest,
): number[] {
  return pull.base === defaultBranch(world, fullName)
    ? closingIssues(pull.body)
    : [];
}

export function openPullRequest(
  ctx: HubContext,
  action: Extract<HubAction, { type: "open-pull-request" }>,
): HubResult {
  const { repo: fullName, base, head, title, body = "" } = action;
  const compared = compareBranches(ctx.world, fullName, base, head);
  if (!compared.ok) return refuseHub(compared.message);
  const hosted = hostedRepo(ctx.world, fullName);
  const open = hosted.pulls.find(
    (p) => p.state === "open" && p.base === base && p.head === head,
  );
  if (open)
    return refuseHub(
      `A pull request from ${head} into ${base} is already open: #${open.number}.`,
    );
  const problem =
    textProblem("The title", title, true) ??
    textProblem("The description", body, false);
  if (problem) return refuseHub(problem);
  const pull: PullRequest = {
    number: nextNumber(hosted),
    title: title.trim(),
    body,
    author: ctx.actor,
    base,
    head,
    opened: ctx.time,
    state: "open",
    comments: [],
    reviews: [],
    branchEvents: [],
  };
  return {
    ok: true,
    world: withHosted(ctx.world, { ...hosted, pulls: [...hosted.pulls, pull] }),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event: {
          type: "pull-request-opened",
          repo: fullName,
          number: pull.number,
          title: pull.title,
        },
      },
    ],
  };
}
