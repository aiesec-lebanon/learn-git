import { flag, lastValue, type OptionSpec } from "../cli/options";
import { moveHead, type HeadTarget } from "../checkout/move-head";
import { branchMessages } from "../messages/branch";
import { mergeMessages } from "../messages/merge";
import { SWITCH_USAGE, checkoutMessages as m } from "../messages/checkout";
import { branchRef, isValidBranchName } from "../refs/names";
import { resolveHead } from "../refs/refs";
import { resolveRevision } from "../revisions/resolve";
import type { ObjectPool, Oid, Repo } from "../types";
import { defineCommand, refuse, type CommandResult } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "create", short: "c", long: "create", value: "required" },
  { key: "force-create", short: "C", long: "force-create", value: "required" },
  { key: "detach", short: "d", long: "detach" },
  { key: "quiet", short: "q", long: "quiet" },
  x("discard-changes"),
  x("force", "f"),
  x("merge", "m"),
  x("conflict", undefined, "required"),
  x("orphan", undefined, "required"),
  x("track", "t", "optional"),
  x("guess"),
  x("ignore-other-worktrees"),
  x("recurse-submodules"),
  x("progress"),
];

/** `@{-1}`: the branch (or commit) HEAD was on before the last checkout. */
export function previousCheckout(repo: Repo): string | null {
  const log = repo.reflogs.get("HEAD") ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const found = /^checkout: moving from (\S+) to /.exec(
      log[i]?.message ?? "",
    );
    if (found?.[1]) return found[1];
  }
  return null;
}

/** `-` and `@{-1}` read the previous checkout; other names stay as typed. */
export function expandPrevious(repo: Repo, name: string): string | null {
  return name === "-" || name === "@{-1}" ? previousCheckout(repo) : name;
}

/** A commit a revision names, or null. */
export function commitOf(
  pool: ObjectPool,
  repo: Repo,
  rev: string,
): Oid | null {
  const resolved = resolveRevision(pool, repo, rev);
  return resolved.ok && pool.get(resolved.oid)?.type === "commit"
    ? resolved.oid
    : null;
}

const invalid = (name: string) =>
  refuse("unknown-revision", m.invalidReference(name));

export const switchCommand = defineCommand({
  name: "switch",
  counted: true,
  needsRepo: true,
  usage: SWITCH_USAGE,
  options: OPTIONS,
  run: ({ world, machine, repo, options, time }) => {
    const unsupported = refuseUnsimulated("switch", options);
    if (unsupported) return unsupported;
    if (repo.op) {
      return refuse(
        "operation-in-progress",
        mergeMessages.switchWhileMerging(),
      );
    }
    const pool = world.objects;
    const { args } = options;
    const created =
      lastValue(options, "force-create") ?? lastValue(options, "create");
    const reset = typeof lastValue(options, "force-create") === "string";
    const detach = flag(options, "detach");
    const move = (target: HeadTarget): CommandResult =>
      moveHead(
        { world, machine, repo, time, quiet: flag(options, "quiet") },
        target,
      );
    if (typeof created === "string") {
      if (detach) return refuse("usage", m.detachWithCreate());
      if (args.length > 1) return refuse("usage", m.oneReference());
      if (!isValidBranchName(created)) {
        return refuse("invalid-ref-name", branchMessages.invalidName(created));
      }
      if (!reset && repo.refs.has(branchRef(created))) {
        return refuse("branch-exists", branchMessages.exists(created));
      }
      const [start = "HEAD"] = args;
      const named = expandPrevious(repo, start);
      const oid = named === null ? null : commitOf(pool, repo, named);
      if (!oid && (args.length || resolveHead(repo))) return invalid(start);
      return move({
        kind: "create",
        name: created,
        start: named ?? start,
        oid,
        reset,
      });
    }
    if (args.length > 1) return refuse("usage", m.oneReference());
    const [typed] = args;
    if (typed === undefined && !detach) {
      return refuse("usage", m.missingArgument());
    }
    const arg = typed ?? "HEAD";
    const name = expandPrevious(repo, arg);
    if (name === null) return invalid("@{-1}");
    if (!detach && repo.refs.has(branchRef(name))) {
      return move({ kind: "branch", name });
    }
    const oid = commitOf(pool, repo, name);
    if (!oid) return invalid(name);
    if (!detach) return refuse("usage", m.branchExpected(name));
    return move({ kind: "detach", label: name, oid });
  },
});
