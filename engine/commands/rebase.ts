import { flag, lastValue, type OptionSpec } from "../cli/options";
import { twoWayCheckout } from "../checkout/two-way";
import { reflogWho } from "../config/identity";
import { mergeBases } from "../merge/base";
import { notSimulated } from "../messages/git";
import { REBASE_USAGE, rebaseMessages as m } from "../messages/rebase";
import { abbreviate } from "../objects/abbrev";
import { branchRef, shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { headBranch, resolveHead } from "../refs/refs";
import { upstreamOf } from "../refs/upstream";
import { rebaseTodo } from "../sequencer/todo";
import {
  commitPick,
  rebaseEffect,
  runRebase,
  type SequencerContext,
} from "../sequencer/run";
import { checkoutPaths } from "../checkout/two-way";
import { stripMessage } from "../commit/message";
import { commitFiles } from "../merge/three-way";
import { withoutOperation } from "../merge/state";
import { readObject } from "../objects/pool";
import { buildTree, sameFile } from "../objects/tree";
import { conflictedPaths, stagedFiles } from "../staging/index";
import { commitTemplate } from "../status/format";
import { compareBytes } from "../util/compare";
import { computeStatus } from "../status/compute";
import type { Effect, Oid, RebaseOperation, RefName, Repo } from "../types";
import { withMachine, withRepo } from "../world/access";
import {
  defineCommand,
  refuse,
  type CommandResult,
  type GitContext,
} from "./registry";
import { commitOf } from "./switch";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "onto", long: "onto", value: "required" },
  { key: "quiet", short: "q", long: "quiet" },
  { key: "continue", long: "continue" },
  { key: "skip", long: "skip" },
  { key: "abort", long: "abort" },
  x("interactive", "i"),
  x("exec", "x", "required"),
  x("root"),
  x("autosquash"),
  x("autostash"),
  x("rebase-merges", "r", "optional"),
  x("keep-base"),
  x("reapply-cherry-picks"),
  x("empty", undefined, "required"),
  x("force-rebase", "f"),
  x("strategy", "s", "required"),
  x("strategy-option", "X", "required"),
  x("edit-todo"),
  x("quit"),
  x("show-current-patch"),
  x("update-refs"),
  x("verbose", "v"),
  x("signoff"),
  x("committer-date-is-author-date"),
  x("ignore-date"),
  x("apply"),
  x("merge", "m"),
  x("no-ff"),
  x("fork-point"),
  x("stat"),
  x("verify"),
  x("gpg-sign", "S", "optional"),
];

type Ctx = GitContext & { readonly repo: Repo };

/** Git's clean-worktree check before a rebase starts; empty when clean. */
function dirtyErrors(ctx: Ctx): string {
  const data = computeStatus(ctx.world.objects, ctx.repo, ctx.machine.fs);
  const unstaged = data.unstaged.length > 0;
  const staged = data.staged.length > 0;
  if (!unstaged && !staged) return "";
  return (
    (unstaged ? m.unstaged() : "") +
    (staged ? m.staged() : "") +
    m.commitOrStash()
  );
}

export type RebaseRequest = {
  /** The upstream's commit and the name it was given by. */
  readonly upstream: Oid;
  readonly onto: Oid;
  readonly ontoName: string;
  /** The branch to rebase; null for HEAD's own. */
  readonly branch: RefName | null;
  readonly quiet: boolean;
  /** What reflog entries start with: `rebase` or `pull --rebase`. */
  readonly action: string;
};

/**
 * Starts a rebase: up to date, or HEAD detaches at the new base and the
 * picks replay (shared by `rebase` and `pull --rebase`).
 */
export function startRebase(ctx: Ctx, req: RebaseRequest): CommandResult {
  const { world, machine, repo, time } = ctx;
  const pool = world.objects;
  const branch = req.branch ?? headBranch(repo);
  const head = branch ? repo.refs.get(branch) : resolveHead(repo);
  if (!branch || !head) {
    return refuse("not-simulated", notSimulated("rebasing a detached HEAD"), 1);
  }
  const dirty = dirtyErrors(ctx);
  if (dirty) return refuse("would-lose-changes", dirty, 1);
  const [base] = mergeBases(pool, req.onto, head);
  const [upstreamBase] = mergeBases(pool, req.upstream, head);
  if (base === req.onto && upstreamBase === req.onto) {
    const name = shortRefName(branch);
    return { stdout: req.quiet ? "" : m.upToDate(name) };
  }
  const todo = rebaseTodo(pool, req.upstream, head);
  const warnings = todo.skipped.length
    ? todo.skipped.map((oid) => m.skipped(abbreviate(pool, oid))).join("") +
      m.skippedHint()
    : "";
  const moved = twoWayCheckout(world, repo, machine, req.onto);
  if (!moved.ok) return moved.refusal;
  const who = reflogWho(world, machine, repo, time);
  const detached: Repo = appendReflog(
    {
      ...moved.repo,
      head: { kind: "detached", oid: req.onto },
      origHead: head,
    },
    "HEAD",
    {
      old: resolveHead(repo),
      new: req.onto,
      who,
      message: `${req.action} (start): checkout ${req.ontoName}`,
    },
  );
  const op: RebaseOperation = {
    kind: "rebase",
    branch,
    head,
    onto: req.onto,
    done: [],
    todo: todo.picks,
  };
  const started: Effect[] = [
    ...moved.effects,
    { kind: "head-changed", repo: repo.id, from: repo.head, to: detached.head },
    { kind: "operation", repo: repo.id, operation: "rebase", phase: "started" },
  ];
  const next = withMachine(withRepo(world, detached), {
    ...machine,
    fs: moved.fs,
  });
  const result = runRebase(
    { world: next, machine, time, action: req.action, quiet: req.quiet },
    detached,
    op,
  );
  return {
    ...result,
    stderr: warnings + (result.stderr ?? ""),
    effects: [...started, ...(result.effects ?? [])],
  };
}

const resumed = (ctx: Ctx, quiet = false): SequencerContext => ({
  world: ctx.world,
  machine: ctx.machine,
  time: ctx.time,
  action: "rebase",
  quiet,
});

/** Index and working tree back to `to`'s files for every path that differs (`reset --hard`). */
function resetTo(ctx: Ctx, repo: Repo, to: Oid) {
  const pool = ctx.world.objects;
  const files = commitFiles(pool, to);
  const staged = stagedFiles(repo.index);
  const conflicted = new Set<string>(conflictedPaths(repo.index));
  const paths = [...new Set([...files.keys(), ...repo.index.keys()])]
    .filter((p) => conflicted.has(p) || !sameFile(files.get(p), staged.get(p)))
    .sort(compareBytes);
  return checkoutPaths(pool, repo, ctx.machine, files, paths);
}

/** `--continue`: commit the resolved pick (through the editor), then the rest. */
function continueRebase(ctx: Ctx, op: RebaseOperation): CommandResult {
  const { world, machine, repo } = ctx;
  const unmerged = conflictedPaths(repo.index);
  if (unmerged.length) {
    return {
      ...refuse("unmerged-paths", "", 1),
      stdout: m.needsMerge(unmerged),
    };
  }
  const stopped = op.done.at(-1);
  const head = resolveHead(repo) as Oid;
  const { root } = buildTree(stagedFiles(repo.index));
  const changed =
    stopped !== undefined &&
    readObject(world.objects, head, "commit").tree !== root;
  let current: Repo = repo;
  let next = world;
  let stdout = "";
  const effects: Effect[] = [rebaseEffect(repo, "resumed")];
  if (changed) {
    if (ctx.answer === undefined) {
      const original = readObject(world.objects, stopped, "commit").message;
      const data = computeStatus(world.objects, repo, machine.fs);
      const template = commitTemplate({
        data,
        repo,
        pool: world.objects,
        from: machine.cwd,
        keep: () => true,
      });
      return {
        request: {
          kind: "editor",
          purpose: "commit-message",
          file: ".git/COMMIT_EDITMSG",
          initial: original + template,
        },
      };
    }
    const message = stripMessage(ctx.answer);
    if (message === "") {
      return refuse(
        "empty-message",
        "Aborting commit due to empty commit message.\n",
        1,
      );
    }
    const picked = commitPick(resumed(ctx), repo, stopped, message);
    if (!picked.ok) return picked.result;
    current = picked.repo;
    next = picked.world;
    stdout = picked.stdout;
    effects.push(...picked.effects);
  }
  const result = runRebase({ ...resumed(ctx), world: next }, current, op);
  return {
    ...result,
    stdout: stdout + (result.stdout ?? ""),
    effects: [...effects, ...(result.effects ?? [])],
  };
}

/** `--skip`: drop the stopped pick's changes and go on with the rest. */
function skipRebase(ctx: Ctx, op: RebaseOperation): CommandResult {
  const reset = resetTo(ctx, ctx.repo, resolveHead(ctx.repo) as Oid);
  const world = withMachine(withRepo(ctx.world, reset.repo), {
    ...ctx.machine,
    fs: reset.fs,
  });
  const result = runRebase(
    { ...resumed(ctx), world, machine: { ...ctx.machine, fs: reset.fs } },
    reset.repo,
    op,
  );
  return {
    ...result,
    effects: [
      rebaseEffect(ctx.repo, "resumed"),
      ...reset.effects,
      ...(result.effects ?? []),
    ],
  };
}

/** `--abort`: back to the branch where it was, files and all. */
function abortRebase(ctx: Ctx, op: RebaseOperation): CommandResult {
  const { world, machine, repo, time } = ctx;
  const reset = resetTo(ctx, repo, op.head);
  const who = reflogWho(world, machine, repo, time);
  const head = op.branch
    ? ({ kind: "symbolic", ref: op.branch } as const)
    : ({ kind: "detached", oid: op.head } as const);
  const back = appendReflog(withoutOperation({ ...reset.repo, head }), "HEAD", {
    old: resolveHead(repo),
    new: op.head,
    who,
    message: `rebase (abort): returning to ${op.branch ?? op.head}`,
  });
  return {
    world: withMachine(withRepo(world, back), { ...machine, fs: reset.fs }),
    effects: [
      ...reset.effects,
      { kind: "head-changed", repo: repo.id, from: repo.head, to: head },
      rebaseEffect(repo, "aborted"),
    ],
  };
}

export const rebase = defineCommand({
  name: "rebase",
  counted: true,
  needsRepo: true,
  usage: REBASE_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const { world, machine, repo, options } = ctx;
    const unsupported = refuseUnsimulated("rebase", options);
    if (unsupported) return unsupported;
    const resume = ["continue", "skip", "abort"].find((k) => flag(options, k));
    if (resume) {
      const op = repo.op?.kind === "rebase" ? repo.op : null;
      if (!op) return refuse("no-operation", m.noRebase());
      if (resume === "abort") return abortRebase(ctx, op);
      return resume === "skip" ? skipRebase(ctx, op) : continueRebase(ctx, op);
    }
    if (repo.op) return refuse("operation-in-progress", m.inProgress());
    const [named, branchName, ...rest] = options.args;
    if (rest.length) return refuse("usage", `${REBASE_USAGE}\n\n`, 129);
    const pool = world.objects;
    let upstreamName = named;
    if (upstreamName === undefined) {
      const current = headBranch(repo);
      const configured =
        current && upstreamOf(world, machine, repo, shortRefName(current));
      if (!configured || !current) {
        return {
          ...refuse("no-upstream", "", 1),
          stdout: m.noTracking(current ? shortRefName(current) : "HEAD"),
        };
      }
      upstreamName = shortRefName(configured);
    }
    const upstream = commitOf(pool, repo, upstreamName);
    if (!upstream)
      return refuse("unknown-revision", m.invalidUpstream(upstreamName));
    const ontoName = lastValue(options, "onto");
    const onto =
      typeof ontoName === "string" ? commitOf(pool, repo, ontoName) : upstream;
    if (!onto)
      return refuse("unknown-revision", m.invalidOnto(String(ontoName)));
    let branch: RefName | null = null;
    if (branchName !== undefined) {
      branch = branchRef(branchName);
      if (!repo.refs.has(branch)) {
        return refuse("unknown-revision", m.noSuchBranch(branchName));
      }
    }
    return startRebase(ctx, {
      upstream,
      onto,
      ontoName: typeof ontoName === "string" ? ontoName : upstreamName,
      branch,
      quiet: flag(options, "quiet"),
      action: "rebase",
    });
  },
});
