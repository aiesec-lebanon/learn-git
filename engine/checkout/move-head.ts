import type { CommandResult } from "../commands/registry";
import { subjectOf } from "../commit/message";
import { reflogWho } from "../config/identity";
import { checkoutMessages as m } from "../messages/checkout";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { branchRef, shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { headBranch, resolveHead, updateRef } from "../refs/refs";
import type { Effect, Head, Machine, Oid, Repo, World } from "../types";
import { withMachine, withRepo } from "../world/access";
import { localChanges, twoWayCheckout } from "./two-way";

/** Where HEAD goes: an existing branch, a new or reset branch, or a commit. */
export type HeadTarget =
  | { readonly kind: "branch"; readonly name: string }
  | {
      readonly kind: "create";
      readonly name: string;
      /** The start point as typed (it names the reflog entry). */
      readonly start: string;
      /** null on an unborn branch with no start point. */
      readonly oid: Oid | null;
      readonly reset: boolean;
    }
  | { readonly kind: "detach"; readonly label: string; readonly oid: Oid };

export type MoveContext = {
  readonly world: World;
  readonly machine: Machine;
  readonly repo: Repo;
  readonly time: number;
  readonly quiet: boolean;
};

const line = (world: World, oid: Oid) =>
  [
    abbreviate(world.objects, oid),
    subjectOf(readObject(world.objects, oid, "commit").message),
  ] as const;

/** The commit a target lands on, null for an unborn branch. */
function landing(repo: Repo, target: HeadTarget): Oid | null {
  if (target.kind === "branch") {
    return repo.refs.get(branchRef(target.name)) ?? null;
  }
  return target.oid;
}

/** The line Git prints once HEAD has moved. */
function arrival(
  world: World,
  target: HeadTarget,
  sameHead: boolean,
  before: Repo,
): string {
  if (target.kind === "detach") return m.headNowAt(...line(world, target.oid));
  const reset = target.kind === "create" && target.reset;
  if (sameHead) {
    return reset ? m.resetBranch(target.name) : m.alreadyOn(target.name);
  }
  if (target.kind === "branch") return m.switched(target.name);
  return reset && before.refs.has(branchRef(target.name))
    ? m.switchedReset(target.name)
    : m.switchedNew(target.name);
}

/** Moves HEAD (and the files) to `target`, as `git switch` and `git checkout` do. */
export function moveHead(ctx: MoveContext, target: HeadTarget): CommandResult {
  const { world, machine, time, quiet } = ctx;
  const before = ctx.repo;
  const from = resolveHead(before);
  const to = landing(before, target);
  let repo = before;
  let fs = machine.fs;
  const effects: Effect[] = [];
  if (to && to !== from) {
    const moved = twoWayCheckout(world, before, machine, to);
    if (!moved.ok) return moved.refusal;
    repo = moved.repo;
    fs = moved.fs;
    effects.push(...moved.effects);
  }
  const who = reflogWho(world, machine, before, time);
  if (target.kind === "create" && target.oid) {
    const ref = branchRef(target.name);
    const verb =
      target.reset && repo.refs.has(ref) ? "Reset to" : "Created from";
    const updated = updateRef(
      repo,
      ref,
      target.oid,
      who,
      `branch: ${verb} ${target.start}`,
    );
    repo = updated.repo;
    effects.push(updated.effect);
  }
  const head: Head =
    target.kind === "detach"
      ? { kind: "detached", oid: target.oid }
      : { kind: "symbolic", ref: branchRef(target.name) };
  const current = headBranch(before);
  const fromLabel = current ? shortRefName(current) : (from ?? "");
  const toLabel = target.kind === "detach" ? target.label : target.name;
  const unchanged =
    head.kind === "detached" &&
    before.head.kind === "detached" &&
    before.head.oid === head.oid;
  if (to && !unchanged) {
    repo = appendReflog(repo, "HEAD", {
      old: from,
      new: to,
      who,
      message: `checkout: moving from ${fromLabel} to ${toLabel}`,
    });
  }
  const sameHead =
    head.kind === before.head.kind &&
    (head.kind === "detached"
      ? head.oid === (before.head.kind === "detached" ? before.head.oid : null)
      : head.ref === current);
  if (!sameHead) {
    repo = { ...repo, head };
    effects.push({
      kind: "head-changed",
      repo: repo.id,
      from: before.head,
      to: head,
    });
  }
  let stderr = "";
  if (!quiet) {
    if (before.head.kind === "detached" && from && from !== to) {
      stderr += m.previousPosition(...line(world, from));
    }
    stderr += arrival(world, target, sameHead, before);
  }
  const stdout = quiet ? "" : localChanges(world.objects, repo, fs, to);
  const next = withRepo(world, repo);
  return {
    world: fs === machine.fs ? next : withMachine(next, { ...machine, fs }),
    stdout,
    stderr,
    effects,
  };
}
