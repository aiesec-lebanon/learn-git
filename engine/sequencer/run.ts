import { twoWayCheckout } from "../checkout/two-way";
import { refuse, type CommandResult } from "../commands/registry";
import { subjectOf } from "../commit/message";
import { reflogWho, resolveIdentity } from "../config/identity";
import { advanceHead } from "../merge/conclude";
import { applyTreeMerge, commitFiles } from "../merge/three-way";
import { withoutOperation } from "../merge/state";
import { rebaseMessages as m } from "../messages/rebase";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { buildTree } from "../objects/tree";
import { writeObjects } from "../objects/write";
import { appendReflog } from "../refs/reflog";
import { resolveHead, updateRef } from "../refs/refs";
import { stagedFiles } from "../staging/index";
import type {
  Commit,
  Effect,
  Machine,
  Oid,
  RebaseOperation,
  Repo,
  World,
} from "../types";
import { machineOf, withMachine, withRepo } from "../world/access";

export type SequencerContext = {
  readonly world: World;
  readonly machine: Machine;
  readonly time: number;
};

type Step = {
  world: World;
  effects: Effect[];
  stdout: string;
};

const operation = (
  repo: Repo,
  phase: "started" | "paused" | "resumed" | "finished" | "aborted",
): Effect => ({ kind: "operation", repo: repo.id, operation: "rebase", phase });

/** `743d676 (Mine)`: how conflict markers and messages name a pick. */
export function pickLabel(world: World, oid: Oid): string {
  const commit = readObject(world.objects, oid, "commit");
  return `${abbreviate(world.objects, oid)} (${subjectOf(commit.message)})`;
}

/** Records the rebased commit for `oid` on top of HEAD (detached), or drops it when it changes nothing. */
export function commitPick(
  ctx: SequencerContext,
  repo: Repo,
  oid: Oid,
  op: RebaseOperation,
  message?: string,
): { ok: true; step: Step; repo: Repo } | { ok: false; result: CommandResult } {
  const { world, machine, time } = ctx;
  const pool = world.objects;
  const original = readObject(pool, oid, "commit");
  const head = resolveHead(repo) as Oid;
  const { root, trees } = buildTree(stagedFiles(repo.index));
  if (readObject(pool, head, "commit").tree === root) {
    return { ok: true, step: { world, effects: [], stdout: "" }, repo };
  }
  const identity = resolveIdentity(world, machine, repo);
  if (!identity.ok)
    return { ok: false, result: refuse("identity-unknown", identity.stderr) };
  const text = message ?? original.message;
  const commit: Commit = {
    type: "commit",
    tree: root,
    parents: [head],
    author: original.author,
    committer: { ...identity.ident, time, tz: "+0000" },
    message: text,
  };
  const written = writeObjects(world, repo.id, [...trees, commit]);
  const created = written.oids.at(-1) as Oid;
  const kind = message === undefined ? "pick" : "continue";
  const advanced = advanceHead(
    { ...repo, arrival: [...repo.arrival, created] },
    created,
    reflogWho(world, machine, repo, time),
    `${op.action} (${kind}): ${subjectOf(text)}`,
  );
  return {
    ok: true,
    step: {
      world: withRepo(written.world, advanced.repo),
      effects: [...written.effects, advanced.effect],
      stdout: "",
    },
    repo: advanced.repo,
  };
}

/** Moves the branch to the result, reattaches HEAD and drops the rebase state. */
function finish(ctx: SequencerContext, repo: Repo, op: RebaseOperation): Step {
  const who = reflogWho(ctx.world, ctx.machine, repo, ctx.time);
  const final = resolveHead(repo) as Oid;
  let next = withoutOperation(repo);
  const effects: Effect[] = [];
  if (op.branch) {
    const moved = updateRef(
      next,
      op.branch,
      final,
      who,
      `${op.action} (finish): ${op.branch} onto ${op.onto}`,
    );
    next = appendReflog(
      { ...moved.repo, head: { kind: "symbolic", ref: op.branch } },
      "HEAD",
      {
        old: final,
        new: final,
        who,
        message: `${op.action} (finish): returning to ${op.branch}`,
      },
    );
    effects.push(moved.effect, {
      kind: "head-changed",
      repo: repo.id,
      from: repo.head,
      to: next.head,
    });
  }
  effects.push(operation(repo, "finished"));
  return { world: withRepo(ctx.world, next), effects, stdout: "" };
}

/**
 * Replays `op.todo` on the detached HEAD: each pick is a three-way merge
 * of the commit onto HEAD (rebase labels: ours = HEAD, the new base side).
 * Stops on a conflict with the operation saved; finishes otherwise.
 */
export function runRebase(
  ctx: SequencerContext,
  start: Repo,
  op: RebaseOperation,
  quiet: boolean,
): CommandResult {
  let world = ctx.world;
  let repo = start;
  let state = op;
  const effects: Effect[] = [];
  let stdout = "";
  for (const oid of op.todo) {
    const machine = machineOf(world, ctx.machine.id);
    const here = { ...ctx, world, machine };
    const head = resolveHead(repo) as Oid;
    const commit = readObject(world.objects, oid, "commit");
    const parent = commit.parents[0] ?? null;
    state = { ...state, done: [...state.done, oid], todo: state.todo.slice(1) };
    if (parent === head) {
      const moved = twoWayCheckout(world, repo, machine, oid);
      if (!moved.ok) return moved.refusal;
      const advanced = advanceHead(
        moved.repo,
        oid,
        reflogWho(world, machine, repo, ctx.time),
        "rebase: fast-forward",
      );
      repo = advanced.repo;
      world = withMachine(withRepo(world, repo), { ...machine, fs: moved.fs });
      effects.push(...moved.effects, advanced.effect);
      continue;
    }
    const label = pickLabel(world, oid);
    const applied = applyTreeMerge(
      world,
      repo,
      machine,
      {
        base: commitFiles(world.objects, parent),
        ours: commitFiles(world.objects, head),
        theirs: commitFiles(world.objects, oid),
      },
      { ours: "HEAD", theirs: label, base: `parent of ${label}` },
    );
    if (!applied.ok) return applied.result;
    effects.push(...applied.effects);
    world = applied.world;
    repo = applied.repo;
    if (applied.conflicts.length) {
      repo = { ...repo, op: state };
      const short = `${abbreviate(world.objects, oid)}... ${subjectOf(commit.message)}`;
      return {
        world: withRepo(world, repo),
        stdout: stdout + applied.lines,
        stderr: m.couldNotApply(short),
        exitCode: 1,
        effects: [...effects, operation(repo, "paused")],
      };
    }
    const picked = commitPick({ ...here, world }, repo, oid, state);
    if (!picked.ok) return picked.result;
    world = picked.step.world;
    repo = picked.repo;
    effects.push(...picked.step.effects);
    stdout += picked.step.stdout;
  }
  const done = finish({ ...ctx, world }, repo, state);
  return {
    world: done.world,
    stdout,
    stderr: quiet ? "" : m.success(state.branch),
    effects: [...effects, ...done.effects],
  };
}
