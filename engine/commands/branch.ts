import { flag, type OptionSpec, type ParsedOptions } from "../cli/options";
import { subjectOf } from "../commit/message";
import { reflogWho } from "../config/identity";
import { moveSection } from "../config/scopes";
import { compileName } from "../ignore/wildmatch";
import { BRANCH_USAGE, branchMessages as m } from "../messages/branch";
import { notSimulated } from "../messages/git";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { isAncestor } from "../reachability";
import { detachedHead } from "../refs/detached";
import { branchRef, isValidBranchName, shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { allRefs, headBranch, resolveHead, updateRef } from "../refs/refs";
import { upstreamOf } from "../refs/upstream";
import {
  trackingBrackets,
  trackingOf,
  type Tracking,
} from "../status/tracking";
import { resolveRevision } from "../revisions/resolve";
import type { Effect, Machine, Oid, RefName, Repo, World } from "../types";
import { compareBytes } from "../util/compare";
import { withoutEntry } from "../util/cow";
import { withRepo } from "../world/access";
import { defineCommand, refuse, type CommandResult } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "verbose", short: "v", long: "verbose" },
  { key: "quiet", short: "q", long: "quiet" },
  { key: "list", short: "l", long: "list" },
  { key: "delete", short: "d", long: "delete" },
  { key: "force-delete", short: "D" },
  { key: "move", short: "m", long: "move" },
  { key: "force-move", short: "M" },
  x("copy", "c"),
  x("C", "C"),
  x("force", "f"),
  { key: "all", short: "a", long: "all" },
  { key: "remotes", short: "r", long: "remotes" },
  x("track", "t", "optional"),
  x("set-upstream-to", "u", "required"),
  x("unset-upstream"),
  x("contains", undefined, "required"),
  x("merged", undefined, "optional"),
  x("points-at", undefined, "required"),
  x("format", undefined, "required"),
  x("sort", undefined, "required"),
  x("column", undefined, "optional"),
  x("show-current"),
  x("edit-description"),
  x("create-reflog"),
  x("color", undefined, "optional"),
  x("abbrev", undefined, "optional"),
  x("ignore-case", "i"),
  x("recurse-submodules"),
  x("omit-empty"),
];

type Ctx = {
  readonly world: World;
  readonly machine: Machine;
  readonly repo: Repo;
  readonly options: ParsedOptions;
  readonly time: number;
};

const usage = () => refuse("usage", `${BRANCH_USAGE}\n\n`, 129);
const branchNames = (repo: Repo) =>
  [...repo.refs.keys()]
    .filter((ref) => ref.startsWith("refs/heads/"))
    .sort(compareBytes);

type Row = {
  readonly name: string;
  readonly oid: Oid;
  readonly current: boolean;
  /** A local branch's upstream comparison, shown by `-v` and `-vv`. */
  readonly tracking?: Tracking | null;
  /** A symbolic ref's target (`origin/HEAD -> origin/main`). */
  readonly target?: string;
};

/** The detached HEAD row `git branch` lists first, as `(HEAD detached at X)`. */
function detachedRow(world: World, repo: Repo): Row | null {
  if (repo.head.kind !== "detached") return null;
  const detached = detachedHead(world.objects, repo);
  const name = detached
    ? `(HEAD detached ${detached.at ? "at" : "from"} ${detached.label})`
    : "(no branch)";
  return { name, oid: repo.head.oid, current: true };
}

/** `remotes/origin/main` rows (`origin/main` with `-r` alone), symbolic ones with their target. */
function remoteRows(repo: Repo, prefix: string): Row[] {
  const refs = allRefs(repo);
  return [...refs.keys()]
    .filter((ref) => ref.startsWith("refs/remotes/"))
    .sort(compareBytes)
    .map((ref) => {
      const target = repo.symrefs?.get(ref);
      return {
        name: `${prefix}${shortRefName(ref)}`,
        oid: refs.get(ref) as Oid,
        current: false,
        ...(target ? { target: shortRefName(target) } : {}),
      };
    });
}

function list({ world, machine, repo, options }: Ctx): CommandResult {
  const patterns = options.args.map(compileName);
  const current = headBranch(repo);
  const all = flag(options, "all");
  const remotes = flag(options, "remotes");
  const local = all || !remotes;
  const detached = patterns.length || !local ? null : detachedRow(world, repo);
  const rows: Row[] = [
    ...(detached ? [detached] : []),
    ...(local
      ? branchNames(repo).map((ref) => ({
          name: shortRefName(ref),
          oid: repo.refs.get(ref) as Oid,
          current: ref === current,
          tracking: trackingOf(world, machine, repo, ref),
        }))
      : []),
    ...(all || remotes ? remoteRows(repo, all ? "remotes/" : "") : []),
  ].filter(
    (row) =>
      row === detached ||
      !patterns.length ||
      patterns.some((match) => match(row.name)),
  );
  const width = Math.max(0, ...rows.map((row) => row.name.length));
  const verbosity = (options.values.get("verbose") ?? []).filter(
    (v) => v === true,
  ).length;
  const stdout = rows
    .map(({ name, oid, current: here, tracking, target }) => {
      const mark = here ? "* " : "  ";
      if (target) return `${mark}${name} -> ${target}\n`;
      if (!verbosity) return `${mark}${name}\n`;
      const commit = readObject(world.objects, oid, "commit");
      const short = abbreviate(world.objects, oid);
      const brackets = tracking
        ? trackingBrackets(tracking, verbosity > 1)
        : "";
      return `${mark}${name.padEnd(width)} ${short} ${brackets}${subjectOf(commit.message)}\n`;
    })
    .join("");
  return { stdout };
}

/** The `refs/heads/` ref that blocks creating `ref` (a file/folder clash), if any. */
function lockClash(repo: Repo, ref: RefName): string | null {
  for (const existing of repo.refs.keys()) {
    if (existing.startsWith(`${ref}/`) || ref.startsWith(`${existing}/`)) {
      return existing;
    }
  }
  return null;
}

function create(ctx: Ctx): CommandResult {
  const { world, machine, repo, options, time } = ctx;
  const [name = "", start = "HEAD"] = options.args;
  if (!isValidBranchName(name))
    return refuse("invalid-ref-name", m.invalidName(name));
  const ref = branchRef(name);
  if (repo.refs.has(ref)) return refuse("branch-exists", m.exists(name));
  const resolved = resolveRevision(world.objects, repo, start);
  if (!resolved.ok) {
    const shown =
      start === "HEAD" && repo.head.kind === "symbolic"
        ? shortRefName(repo.head.ref)
        : start;
    return refuse("unknown-revision", m.notValidObject(shown));
  }
  if (world.objects.get(resolved.oid)?.type !== "commit") {
    return refuse("unknown-revision", m.notBranchPoint(start));
  }
  const clash = lockClash(repo, ref);
  if (clash) return refuse("branch-exists", m.cannotLock(ref, clash));
  const who = reflogWho(world, machine, repo, time);
  const moved = updateRef(
    repo,
    ref,
    resolved.oid,
    who,
    `branch: Created from ${start}`,
  );
  return { world: withRepo(world, moved.repo), effects: [moved.effect] };
}

/** The ref `-d` checks against: the upstream when set and present, else HEAD. */
function mergeTarget(ctx: Ctx, name: string): { ref: string; oid: Oid | null } {
  const { world, machine, repo } = ctx;
  const upstream = upstreamOf(world, machine, repo, name);
  const oid = upstream ? repo.refs.get(upstream) : undefined;
  return upstream && oid
    ? { ref: upstream, oid }
    : { ref: "HEAD", oid: resolveHead(repo) };
}

function remove(ctx: Ctx, force: boolean): CommandResult {
  const { world, options } = ctx;
  if (!options.args.length) return refuse("usage", m.nameRequired());
  let repo = ctx.repo;
  let stdout = "";
  let stderr = "";
  const effects: Effect[] = [];
  for (const name of options.args) {
    const ref = branchRef(name);
    const oid = repo.refs.get(ref);
    if (headBranch(repo) === ref) {
      stderr += m.usedByWorktree(name, repo.workdir);
      effects.push({
        kind: "refused",
        code: "branch-checked-out",
        subject: name,
      });
      continue;
    }
    if (!oid) {
      stderr += m.notFound(name);
      effects.push({ kind: "refused", code: "no-such-branch", subject: name });
      continue;
    }
    if (!force) {
      const target = mergeTarget({ ...ctx, repo }, name);
      if (!target.oid || !isAncestor(world.objects, oid, target.oid)) {
        stderr += m.notFullyMerged(name);
        effects.push({
          kind: "refused",
          code: "not-fully-merged",
          subject: name,
        });
        continue;
      }
      const head = resolveHead(repo);
      if (
        target.ref !== "HEAD" &&
        head &&
        !isAncestor(world.objects, oid, head)
      ) {
        stderr += m.mergedNotToHead(name, target.ref);
      }
    }
    const deleted = updateRef(
      repo,
      ref,
      null,
      reflogWho(world, ctx.machine, repo, ctx.time),
      "",
    );
    const section = moveSection(deleted.repo, `branch.${name}`, null);
    repo = section.repo;
    effects.push(deleted.effect, ...section.effects);
    if (!flag(options, "quiet")) {
      stdout += m.deleted(name, abbreviate(world.objects, oid));
    }
  }
  const failed = effects.some((e) => e.kind === "refused");
  return {
    world: withRepo(world, repo),
    stdout,
    stderr,
    exitCode: failed ? 1 : 0,
    effects,
  };
}

function rename(ctx: Ctx, force: boolean): CommandResult {
  const { world, machine, options, time } = ctx;
  const { args } = options;
  if (!args.length) return refuse("usage", m.nameRequired());
  if (args.length > 2) return refuse("usage", m.tooManyRename());
  const current = headBranch(ctx.repo);
  if (args.length === 1 && !current) return refuse("usage", m.renameDetached());
  const oldName =
    args.length === 2 ? (args[0] ?? "") : shortRefName(current ?? "");
  const newName = args.at(-1) ?? "";
  const oldRef = branchRef(oldName);
  const newRef = branchRef(newName);
  const oid = ctx.repo.refs.get(oldRef) ?? null;
  if (!oid && oldRef !== current) {
    return refuse("no-such-branch", m.noBranchNamed(oldName));
  }
  if (!isValidBranchName(newName))
    return refuse("invalid-ref-name", m.invalidName(newName));
  if (oldRef !== newRef && ctx.repo.refs.has(newRef)) {
    if (!force) return refuse("branch-exists", m.exists(newName));
    if (newRef === current) {
      return refuse(
        "branch-checked-out",
        m.forceUsedByWorktree(newName, ctx.repo.workdir),
      );
    }
  }
  const message = `Branch: renamed ${oldRef} to ${newRef}`;
  const who = reflogWho(world, machine, ctx.repo, time);
  const effects: Effect[] = [];
  let repo = ctx.repo;
  if (oid) {
    const history = repo.reflogs.get(oldRef) ?? [];
    const refs = new Map(withoutEntry(repo.refs, oldRef)).set(newRef, oid);
    const reflogs = new Map(withoutEntry(repo.reflogs, oldRef)).set(newRef, [
      ...history,
      { old: oid, new: oid, who, message },
    ]);
    repo = { ...repo, refs, reflogs };
    if (oldRef !== newRef) {
      effects.push(
        {
          kind: "ref-updated",
          repo: repo.id,
          ref: oldRef,
          from: oid,
          to: null,
        },
        {
          kind: "ref-updated",
          repo: repo.id,
          ref: newRef,
          from: ctx.repo.refs.get(newRef) ?? null,
          to: oid,
        },
      );
    }
  }
  if (oldRef === current) {
    if (oid) {
      repo = appendReflog(repo, "HEAD", { old: oid, new: null, who, message });
      repo = appendReflog(repo, "HEAD", {
        old: oldRef === newRef ? oid : null,
        new: oid,
        who,
        message,
      });
    }
    if (oldRef !== newRef) {
      repo = { ...repo, head: { kind: "symbolic", ref: newRef } };
      effects.push({
        kind: "head-changed",
        repo: repo.id,
        from: ctx.repo.head,
        to: repo.head,
      });
    }
  }
  if (oldRef !== newRef) {
    const section = moveSection(repo, `branch.${oldName}`, `branch.${newName}`);
    repo = section.repo;
    effects.push(...section.effects);
  }
  return { world: withRepo(world, repo), effects };
}

export const branch = defineCommand({
  name: "branch",
  counted: true,
  needsRepo: true,
  usage: BRANCH_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const { options } = ctx;
    const unsupported = refuseUnsimulated("branch", options);
    if (unsupported) return unsupported;
    const forceDelete = flag(options, "force-delete");
    const deleting = flag(options, "delete") || forceDelete;
    const forceMove = flag(options, "force-move");
    const moving = flag(options, "move") || forceMove;
    if (deleting && moving) return usage();
    if (flag(options, "remotes") && (deleting || moving)) {
      return refuse(
        "not-simulated",
        notSimulated("deleting or renaming remote-tracking branches"),
        1,
      );
    }
    if (deleting) return remove(ctx, forceDelete);
    if (moving) return rename(ctx, forceMove);
    if (
      flag(options, "list") ||
      flag(options, "verbose") ||
      !options.args.length
    ) {
      return list(ctx);
    }
    return options.args.length > 2 ? usage() : create(ctx);
  },
});
