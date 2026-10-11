import { flag, lastValue, stringValues, type OptionSpec } from "../cli/options";
import { twoWayUpdate } from "../checkout/two-way";
import { cleanupMessage } from "../commit/message";
import { reflogWho } from "../config/identity";
import { ancestorsOf } from "../merge/base";
import { advanceHead, mergeStat } from "../merge/conclude";
import { commitFiles, threeWayMerge } from "../merge/three-way";
import { notSimulated } from "../messages/git";
import { MERGE_USAGE, mergeMessages as m } from "../messages/merge";
import { abbreviate } from "../objects/abbrev";
import { shortRefName } from "../refs/names";
import { headBranch, resolveHead } from "../refs/refs";
import { upstreamOf } from "../refs/upstream";
import { conflictedPaths } from "../staging/index";
import type { Oid, Repo } from "../types";
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
  { key: "allow-unrelated-histories", long: "allow-unrelated-histories" },
  x("abort"),
  x("continue"),
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

function fastForward(
  ctx: MergeContext,
  repo: Repo,
  head: Oid,
  theirs: Oid,
  typed: string,
): CommandResult {
  const { world, machine, options, time } = ctx;
  const quiet = flag(options, "quiet");
  const pool = world.objects;
  const updating = quiet
    ? ""
    : m.updating(abbreviate(pool, head), abbreviate(pool, theirs));
  const moved = twoWayUpdate(
    world,
    repo,
    machine,
    commitFiles(pool, theirs),
    "merge",
  );
  if (!moved.ok) {
    return { ...moved.refusal, world: withRepo(world, repo), stdout: updating };
  }
  const who = reflogWho(world, machine, repo, time);
  const advanced = advanceHead(
    moved.repo,
    theirs,
    who,
    `merge ${typed}: Fast-forward`,
  );
  const next = withRepo(world, advanced.repo);
  return {
    world:
      moved.fs === machine.fs
        ? next
        : withMachine(next, { ...machine, fs: moved.fs }),
    stdout: quiet
      ? ""
      : updating + m.fastForward() + mergeStat(pool, head, theirs),
    effects: [...moved.effects, advanced.effect],
  };
}

export const merge = defineCommand({
  name: "merge",
  counted: true,
  needsRepo: true,
  usage: MERGE_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const { world, machine, repo, options, time } = ctx;
    const unsupported = refuseUnsimulated("merge", options);
    if (unsupported) return unsupported;
    if (flag(options, "edit")) {
      return refuse("not-simulated", notSimulated("git merge --edit"), 1);
    }
    if (conflictedPaths(repo.index).length) {
      return refuse("usage", m.unmerged("Merging"));
    }
    if (repo.op) return refuse("usage", m.notConcluded());
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
    const marked: Repo = { ...repo, origHead: head };
    if (ancestorsOf(pool, head).has(theirs)) {
      return { world: withRepo(world, marked), stdout: m.upToDate() };
    }
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
    const paragraphs = stringValues(options, "message");
    return threeWayMerge({
      world,
      machine,
      repo: marked,
      time,
      head,
      theirs,
      typed,
      message: paragraphs.length ? cleanupMessage(paragraphs) : null,
      quiet: flag(options, "quiet"),
      allowUnrelated: flag(options, "allow-unrelated-histories"),
    });
  },
});
