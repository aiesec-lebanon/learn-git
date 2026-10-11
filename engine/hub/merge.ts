import { branchRef } from "../refs/names";
import type { HubAction, Oid, PullRequest, World } from "../types";
import { repoOf } from "../world/access";
import { hubCommit, setHubBranch } from "./commit";
import { dryMerge } from "./mergeability";
import { locatePull, pullCompare, replacePull } from "./pulls";
import { refuseHub, type HubContext, type HubResult } from "./result";
import { reviewDecision } from "./reviews";
import { pushRefusal } from "./rules";
import { hostedRepo } from "./state";

type PullAction = Extract<
  HubAction,
  { type: "merge-pull-request" | "delete-branch" | "restore-branch" }
>;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Why the pull request cannot merge now (empty when it can), in the order the merge box shows them. */
export function mergeBlockers(
  world: World,
  fullName: string,
  pull: PullRequest,
): string[] {
  if (pull.state !== "open")
    return [`Pull request #${pull.number} is ${pull.state}.`];
  const hosted = hostedRepo(world, fullName);
  const refs = repoOf(world, hosted.repo).refs;
  if (!refs.has(branchRef(pull.head)))
    return [`The branch ${pull.head} was deleted.`];
  const out: string[] = [];
  const rule = hosted.rules.find((r) => r.branch === pull.base);
  const needed = rule?.requiredApprovals ?? 0;
  if (rule) {
    const { approved, changesRequested } = reviewDecision(pull);
    if (changesRequested.length)
      out.push(`Changes were requested by ${changesRequested.join(", ")}.`);
    const approvals = approved.filter((a) => a !== pull.author).length;
    if (approvals < needed)
      out.push(
        `${pull.base} needs ${plural(needed, "approving review")} before merging.`,
      );
  }
  const compared = pullCompare(world, fullName, pull);
  if (!compared?.commits.length)
    out.push(`${pull.base} already has every commit on ${pull.head}.`);
  else if (compared.mergeable.kind === "conflicts")
    out.push("This branch has conflicts that must be resolved.");
  return out;
}

function mergePull(ctx: HubContext, action: PullAction): HubResult {
  const found = locatePull(ctx.world, action.repo, action.number);
  if (!found.ok) return refuseHub(found.message);
  const { hosted, pull } = found;
  const [blocker] = mergeBlockers(ctx.world, action.repo, pull);
  if (blocker) return refuseHub(blocker);
  const refs = repoOf(ctx.world, hosted.repo).refs;
  const base = refs.get(branchRef(pull.base)) as Oid;
  const head = refs.get(branchRef(pull.head)) as Oid;
  const merged = dryMerge(ctx.world.objects, base, head);
  if (!merged.ok)
    return refuseHub("This branch has conflicts that must be resolved.");
  const made = hubCommit(ctx.world, hosted.repo, {
    files: merged.files,
    blobs: merged.blobs,
    parents: [base, head],
    author: ctx.actor,
    message: `Merge pull request #${pull.number} from ${hosted.owner}/${pull.head}\n\n${pull.title}\n`,
    time: ctx.time,
  });
  const moved = setHubBranch(made.world, hosted.repo, pull.base, made.oid);
  const done: PullRequest = {
    ...pull,
    state: "merged",
    merged: { by: ctx.actor, time: ctx.time, commit: made.oid, base, head },
  };
  return {
    ok: true,
    world: replacePull(moved.world, hosted, done),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event: {
          type: "pull-request-merged",
          repo: action.repo,
          number: pull.number,
          base: pull.base,
        },
      },
      ...made.effects,
      moved.effect,
    ],
  };
}

function moveHeadBranch(ctx: HubContext, action: PullAction): HubResult {
  const found = locatePull(ctx.world, action.repo, action.number);
  if (!found.ok) return refuseHub(found.message);
  const { hosted, pull } = found;
  if (!pull.merged)
    return refuseHub(
      `Merge pull request #${pull.number} before deleting its branch.`,
    );
  const exists = repoOf(ctx.world, hosted.repo).refs.has(branchRef(pull.head));
  const deleting = action.type === "delete-branch";
  if (deleting !== exists)
    return refuseHub(
      `The branch ${pull.head} ${deleting ? "is already deleted" : "already exists"}.`,
    );
  const protectedBy = deleting
    ? pushRefusal(ctx.world, hosted.repo, pull.head, "delete")
    : null;
  if (protectedBy) return refuseHub(protectedBy.message);
  const moved = setHubBranch(
    ctx.world,
    hosted.repo,
    pull.head,
    deleting ? null : pull.merged.head,
  );
  const kind = deleting ? "deleted" : "restored";
  const done: PullRequest = {
    ...pull,
    branchEvents: [
      ...pull.branchEvents,
      { kind, by: ctx.actor, time: ctx.time },
    ],
  };
  return {
    ok: true,
    world: replacePull(moved.world, hosted, done),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event: {
          type: deleting ? "branch-deleted" : "branch-restored",
          repo: action.repo,
          branch: pull.head,
        },
      },
      moved.effect,
    ],
  };
}

export function runPullAction(ctx: HubContext, action: PullAction): HubResult {
  return action.type === "merge-pull-request"
    ? mergePull(ctx, action)
    : moveHeadBranch(ctx, action);
}
