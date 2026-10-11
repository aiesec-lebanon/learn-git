import { moveHead, type HeadTarget } from "../checkout/move-head";
import { localChanges } from "../checkout/two-way";
import { flag, lastValue, type ParsedOptions } from "../cli/options";
import { older, outside, specsFor } from "../cli/legacy";
import { shellQuote } from "../cli/tokenize";
import { resolvePath } from "../files/paths";
import { branchMessages } from "../messages/branch";
import { checkoutMessages as m } from "../messages/checkout";
import { revisionMessages } from "../messages/revisions";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { branchRef, isValidBranchName } from "../refs/names";
import { resolveHead } from "../refs/refs";
import { applyRestore, sourceFiles } from "../restore/apply";
import type { Machine, Oid, Repo, World } from "../types";
import { defineCommand, refuse, type CommandResult } from "./registry";
import { commitOf, expandPrevious } from "./switch";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

type Ctx = {
  readonly world: World;
  readonly machine: Machine;
  readonly repo: Repo;
  readonly options: ParsedOptions;
  readonly time: number;
};

const olderSwitch = (words: readonly string[]) =>
  `Older form of: git switch ${words.map(shellQuote).join(" ")}`;

function moveTo(ctx: Ctx, target: HeadTarget, modern: readonly string[]) {
  const result = moveHead(
    { ...ctx, quiet: flag(ctx.options, "quiet") },
    target,
  );
  return result.exitCode ? result : { ...result, notes: [olderSwitch(modern)] };
}

/** `-b`/`-B <name> [<start>]`: create (or reset) a branch and switch to it. */
function createBranch(ctx: Ctx, name: string, reset: boolean): CommandResult {
  const { world, repo, options } = ctx;
  if (flag(options, "detach")) return refuse("usage", m.detachWithCreate());
  if (options.args.length > 1) return refuse("usage", m.oneReference());
  if (!isValidBranchName(name)) {
    return refuse("invalid-ref-name", branchMessages.invalidName(name));
  }
  if (!reset && repo.refs.has(branchRef(name))) {
    return refuse("branch-exists", branchMessages.exists(name));
  }
  const [start = "HEAD"] = options.args;
  const named = expandPrevious(repo, start);
  const oid = named === null ? null : commitOf(world.objects, repo, named);
  if (!oid && (options.args.length || resolveHead(repo))) {
    return refuse("unknown-revision", m.invalidReference(start));
  }
  return moveTo(ctx, { kind: "create", name, start, oid, reset }, [
    reset ? "-C" : "-c",
    name,
    ...options.args,
  ]);
}

/** A branch name switches to it; any other commit detaches HEAD there. */
function switchTo(ctx: Ctx, typed: string, name: string, oid: Oid) {
  const detach = flag(ctx.options, "detach");
  if (!detach && ctx.repo.refs.has(branchRef(name))) {
    return moveTo(ctx, { kind: "branch", name }, [typed]);
  }
  const advise = !detach && ctx.repo.head.kind === "symbolic";
  return moveTo(ctx, { kind: "detach", label: name, oid, advise }, [
    "--detach",
    typed,
  ]);
}

/** `[<commit>] [--] <paths>`: copy files from the index or a commit. */
function checkoutPaths(
  ctx: Ctx,
  commit: { typed: string; oid: Oid } | null,
  paths: readonly string[],
): CommandResult {
  const { world, machine, repo, options } = ctx;
  const parsed = specsFor(repo, machine, paths);
  if (!parsed.ok) return outside(repo, parsed.outside);
  const result = applyRestore(world, repo, machine, {
    source: commit ? sourceFiles(world, commit.oid) : null,
    staged: commit !== null,
    worktree: true,
    overlay: true,
    strict: true,
    specs: parsed.specs,
  });
  if (result.exitCode) return result;
  const modern = commit ? `--source=${commit.typed} --staged --worktree ` : "";
  const notes = [older(modern, paths)];
  if (options.afterDashDash !== null || flag(options, "quiet")) {
    return { ...result, notes };
  }
  const count = (result.effects ?? []).reduce(
    (n, e) =>
      e.kind === "files-changed"
        ? n + e.changes.filter((c) => c.node === "file").length
        : n,
    0,
  );
  const from = commit
    ? abbreviate(
        world.objects,
        readObject(world.objects, commit.oid, "commit").tree,
      )
    : "the index";
  return { ...result, stderr: m.updatedPaths(count, from), notes };
}

export const checkout = defineCommand({
  name: "checkout",
  counted: true,
  needsRepo: true,
  legacy: true,
  usage: `usage: git checkout [<options>] <branch>
   or: git checkout [<options>] [<branch>] -- <file>...`,
  options: [
    { key: "quiet", short: "q", long: "quiet" },
    { key: "create", short: "b", value: "required" },
    { key: "force-create", short: "B", value: "required" },
    { key: "detach", long: "detach" },
    x("force", "f"),
    x("merge", "m"),
    x("patch", "p"),
    x("ours", "2"),
    x("theirs", "3"),
    x("orphan", undefined, "required"),
    x("track", "t", "optional"),
    x("conflict", undefined, "required"),
    x("overlay"),
  ],
  run: (ctx) => {
    const { world, machine, repo, options } = ctx;
    const unsupported = refuseUnsimulated("checkout", options);
    if (unsupported) return unsupported;
    const reset = lastValue(options, "force-create");
    const created = reset ?? lastValue(options, "create");
    const { args, afterDashDash } = options;
    if (typeof created === "string") {
      if (afterDashDash !== null) {
        return refuse(
          "not-simulated",
          "not simulated here: git checkout -b with paths\n",
          1,
        );
      }
      return createBranch(ctx, created, typeof reset === "string");
    }
    if (afterDashDash === 0) return checkoutPaths(ctx, null, args);
    if (afterDashDash !== null && afterDashDash > 1) {
      return refuse("usage", m.referencesGiven(afterDashDash));
    }
    const [typed] = args;
    if (typed === undefined) {
      const head = resolveHead(repo);
      if (!flag(options, "detach")) {
        return { stdout: localChanges(world.objects, repo, machine.fs, head) };
      }
      if (!head) return refuse("unknown-revision", m.invalidReference("HEAD"));
      return switchTo(ctx, "HEAD", "HEAD", head);
    }
    const name = expandPrevious(repo, typed) ?? typed;
    const oid = commitOf(world.objects, repo, name);
    if (!oid) {
      if (afterDashDash === 1) {
        return refuse("unknown-revision", m.invalidReference(typed));
      }
      return checkoutPaths(ctx, null, args);
    }
    const paths = args.slice(1);
    if (!paths.length) return switchTo(ctx, typed, name, oid);
    const file = resolvePath(machine.cwd, typed);
    if (
      afterDashDash === null &&
      (machine.fs.files.has(file) || machine.fs.dirs.has(file))
    ) {
      return refuse("usage", revisionMessages.both(typed));
    }
    return checkoutPaths(ctx, { typed, oid }, paths);
  },
});
