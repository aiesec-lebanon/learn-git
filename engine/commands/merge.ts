import { flag, lastValue, stringValues, type OptionSpec } from "../cli/options";
import { twoWayCheckout } from "../checkout/two-way";
import { cleanupMessage } from "../commit/message";
import { summaryLines } from "../commit/summary";
import { reflogWho, resolveIdentity } from "../config/identity";
import { changedPairs, commitSnapshot } from "../diff/forms";
import { diffStat } from "../diff/stat";
import { ancestorsOf } from "../merge/base";
import { notSimulated } from "../messages/git";
import { MERGE_USAGE, mergeMessages as m } from "../messages/merge";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { writeObjects } from "../objects/write";
import { shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { headBranch, resolveHead, updateRef } from "../refs/refs";
import { upstreamOf } from "../refs/upstream";
import { dwimRefs } from "../revisions/resolve";
import type {
  Commit,
  Effect,
  Fs,
  Machine,
  ObjectPool,
  Oid,
  Repo,
  World,
} from "../types";
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
  { key: "ff", long: "ff" },
  { key: "ff", long: "ff-only", constant: "only" },
  { key: "message", short: "m", long: "message", value: "required" },
  { key: "quiet", short: "q", long: "quiet" },
  { key: "edit", short: "e", long: "edit" },
  x("abort"),
  x("continue"),
  x("allow-unrelated-histories"),
  x("squash"),
  x("commit"),
  x("strategy", "s", "required"),
  x("strategy-option", "X", "required"),
  x("file", "F", "required"),
  x("verbose", "v"),
  x("stat"),
  x("summary"),
  x("log", undefined, "optional"),
  x("signoff"),
  x("verify"),
  x("autostash"),
  x("rerere-autoupdate"),
  x("gpg-sign", "S", "optional"),
  x("into-name", undefined, "required"),
  x("overwrite-ignore"),
  x("progress"),
];

type MergeContext = GitContext & { readonly repo: Repo };

/** Git's default merge message (`fmt-merge-msg`) for one merged name. */
export function defaultMergeMessage(repo: Repo, typed: string): string {
  const [ref] = dwimRefs(repo, typed);
  const what = ref?.startsWith("refs/heads/")
    ? `branch '${shortRefName(ref)}'`
    : ref?.startsWith("refs/remotes/")
      ? `remote-tracking branch '${shortRefName(ref)}'`
      : `commit '${typed}'`;
  const branch = headBranch(repo);
  const current = branch ? shortRefName(branch) : "HEAD";
  const into = ["main", "master"].includes(current) ? "" : ` into ${current}`;
  return `Merge ${what}${into}\n`;
}

/** The diffstat and summary Git prints after a merge moves HEAD. */
function mergeStat(pool: ObjectPool, from: Oid, to: Oid): string {
  const pairs = changedPairs(
    commitSnapshot(pool, from),
    commitSnapshot(pool, to),
  );
  return diffStat(pairs) + summaryLines(pairs);
}

/** Moves the current branch (or a detached HEAD) to `to` with a reflog entry. */
export function advanceHead(
  repo: Repo,
  to: Oid,
  who: ReturnType<typeof reflogWho>,
  message: string,
): { repo: Repo; effect: Effect } {
  if (repo.head.kind === "symbolic") {
    return updateRef(repo, repo.head.ref, to, who, message);
  }
  const from = repo.head;
  const next = appendReflog(
    { ...repo, head: { kind: "detached", oid: to } },
    "HEAD",
    { old: from.oid, new: to, who, message },
  );
  return {
    repo: next,
    effect: { kind: "head-changed", repo: repo.id, from, to: next.head },
  };
}

const withFiles = (world: World, machine: Machine, fs: Fs) =>
  fs === machine.fs ? world : withMachine(world, { ...machine, fs });

/** Moves HEAD and the files to `to` after a merge, or refuses with Git's error. */
function land(
  ctx: MergeContext,
  world: World,
  repo: Repo,
  to: Oid,
  reflog: string,
  effects: readonly Effect[],
):
  | { ok: true; world: World; effects: Effect[] }
  | { ok: false; result: CommandResult } {
  const moved = twoWayCheckout(world, repo, ctx.machine, to, "merge");
  if (!moved.ok) return { ok: false, result: moved.refusal };
  const who = reflogWho(world, ctx.machine, repo, ctx.time);
  const advanced = advanceHead(moved.repo, to, who, reflog);
  return {
    ok: true,
    world: withFiles(withRepo(world, advanced.repo), ctx.machine, moved.fs),
    effects: [...effects, ...moved.effects, advanced.effect],
  };
}

function fastForward(
  ctx: MergeContext,
  repo: Repo,
  head: Oid,
  theirs: Oid,
  typed: string,
): CommandResult {
  const { world, options } = ctx;
  const quiet = flag(options, "quiet");
  const pool = world.objects;
  const updating = quiet
    ? ""
    : m.updating(abbreviate(pool, head), abbreviate(pool, theirs));
  const landed = land(
    ctx,
    world,
    repo,
    theirs,
    `merge ${typed}: Fast-forward`,
    [],
  );
  if (!landed.ok) {
    return {
      ...landed.result,
      world: withRepo(world, repo),
      stdout: updating,
    };
  }
  return {
    world: landed.world,
    stdout: quiet
      ? ""
      : updating + m.fastForward() + mergeStat(pool, head, theirs),
    effects: landed.effects,
  };
}

/** Records a merge commit of HEAD and `theirs` with the merged `tree`. */
function commitMerge(
  ctx: MergeContext,
  repo: Repo,
  head: Oid,
  theirs: Oid,
  typed: string,
  tree: Oid,
): CommandResult {
  const { machine, options, time } = ctx;
  const identity = resolveIdentity(ctx.world, machine, repo);
  if (!identity.ok) return refuse("identity-unknown", identity.stderr);
  const paragraphs = stringValues(options, "message");
  const who = { ...identity.ident, time, tz: "+0000" };
  const object: Commit = {
    type: "commit",
    tree,
    parents: [head, theirs],
    author: who,
    committer: who,
    message: paragraphs.length
      ? cleanupMessage(paragraphs)
      : defaultMergeMessage(repo, typed),
  };
  const written = writeObjects(ctx.world, repo.id, [object]);
  const oid = written.oids[0] as Oid;
  const landed = land(
    ctx,
    written.world,
    { ...repo, arrival: [...repo.arrival, oid] },
    oid,
    `merge ${typed}: Merge made by the 'ort' strategy.`,
    written.effects,
  );
  if (!landed.ok) return { ...landed.result, world: withRepo(ctx.world, repo) };
  const pool = landed.world.objects;
  return {
    world: landed.world,
    stdout: flag(options, "quiet")
      ? ""
      : m.madeBy() + mergeStat(pool, head, oid),
    effects: landed.effects,
  };
}

export const merge = defineCommand({
  name: "merge",
  counted: true,
  needsRepo: true,
  usage: MERGE_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const { world, machine, repo, options } = ctx;
    const unsupported = refuseUnsimulated("merge", options);
    if (unsupported) return unsupported;
    if (flag(options, "edit")) {
      return refuse("not-simulated", notSimulated("git merge --edit"), 1);
    }
    const pool = world.objects;
    let names = options.args;
    if (!names.length) {
      const branch = headBranch(repo);
      const upstream =
        branch && upstreamOf(world, machine, repo, shortRefName(branch));
      if (!upstream || !repo.refs.has(upstream)) {
        return refuse("usage", m.noRemote());
      }
      names = [shortRefName(upstream)];
    }
    const oids: Oid[] = [];
    for (const name of names) {
      const oid = commitOf(pool, repo, name);
      if (!oid) return refuse("unknown-revision", m.notSomething(name), 1);
      oids.push(oid);
    }
    const [theirs] = oids;
    const [typed = ""] = names;
    if (oids.length > 1 || !theirs) {
      return refuse(
        "not-simulated",
        notSimulated("merging several branches at once"),
        1,
      );
    }
    const head = resolveHead(repo);
    if (!head) {
      return refuse(
        "not-simulated",
        notSimulated("merging into a branch with no commits yet"),
        1,
      );
    }
    if (ancestorsOf(pool, head).has(theirs)) return { stdout: m.upToDate() };
    const marked: Repo = { ...repo, origHead: head };
    const ff = lastValue(options, "ff");
    if (ff !== false && ancestorsOf(pool, theirs).has(head)) {
      return fastForward(ctx, marked, head, theirs, typed);
    }
    if (ff === "only") {
      return {
        ...refuse("usage", m.notPossibleToFastForward()),
        world: withRepo(world, marked),
      };
    }
    if (ancestorsOf(pool, theirs).has(head)) {
      const tree = readObject(pool, theirs, "commit").tree;
      return commitMerge(ctx, marked, head, theirs, typed, tree);
    }
    return refuse("not-simulated", notSimulated("three-way merges"), 1);
  },
});
