import { flag, stringValues, type OptionSpec } from "../cli/options";
import { shellQuote } from "../cli/tokenize";
import { checkoutPaths } from "../checkout/two-way";
import { reflogWho } from "../config/identity";
import { changedPairs, commitSnapshot, treeSnapshot } from "../diff/forms";
import { diffStat } from "../diff/stat";
import { unifiedDiff } from "../diff/unified";
import { worktreeFiles } from "../files/worktree";
import { commitFiles } from "../merge/three-way";
import { notSimulated } from "../messages/git";
import { STASH_USAGE, stashMessages as m } from "../messages/stash";
import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { appendReflog } from "../refs/reflog";
import { resolveHead, updateRef } from "../refs/refs";
import { applyStash } from "../stash/apply";
import { createStash } from "../stash/create";
import {
  dropStash,
  pickStash,
  STASH_REF,
  stashEntries,
} from "../stash/entries";
import { conflictedPaths, stagedFiles } from "../staging/index";
import { computeStatus } from "../status/compute";
import { longStatus } from "../status/format";
import type { Oid, Repo, World } from "../types";
import { compareBytes } from "../util/compare";
import { machineOf, withMachine, withRepo } from "../world/access";
import {
  defineCommand,
  refuse,
  type CommandResult,
  type GitContext,
} from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "message", short: "m", long: "message", value: "required" },
  { key: "quiet", short: "q", long: "quiet" },
  { key: "patch", short: "p", long: "patch" },
  { key: "stat", long: "stat" },
  x("include-untracked", "u"),
  x("all", "a"),
  x("keep-index", "k"),
  x("staged", "S"),
  x("index"),
  x("pathspec-from-file", undefined, "required"),
  x("only-untracked"),
];

type Ctx = GitContext & { readonly repo: Repo };

/** `git status` as `stash apply` prints it, from the current directory. */
function statusText(world: World, repo: Repo): string {
  const machine = machineOf(world, repo.machine);
  const data = computeStatus(world.objects, repo, machine.fs);
  return longStatus({
    data,
    repo,
    pool: world.objects,
    from: machine.cwd,
    keep: () => true,
  });
}

function push(ctx: Ctx, message: string | null): CommandResult {
  const { world, machine, repo, time, options } = ctx;
  const head = resolveHead(repo);
  if (!head) return refuse("unborn-branch", m.noInitialCommit(), 1);
  const unmerged = conflictedPaths(repo.index);
  if (unmerged.length) {
    return refuse(
      "unmerged-paths",
      m.couldNotWriteIndex(),
      1,
      m.needsMerge(unmerged),
    );
  }
  const created = createStash(world, repo, machine, time, message);
  if (!created) return { stdout: m.noLocalChanges() };
  const who = reflogWho(world, machine, repo, time);
  const stashed = updateRef(repo, STASH_REF, created.oid, who, created.message);
  const work = readObject(created.world.objects, created.oid, "commit");
  const headFiles = commitFiles(created.world.objects, head);
  const staged = stagedFiles(repo.index);
  const disk = worktreeFiles(machine.fs, repo.workdir);
  const paths = [...new Set([...headFiles.keys(), ...staged.keys()])]
    .filter((p) => {
      const h = headFiles.get(p);
      const i = staged.get(p);
      const content = disk.get(p);
      const onDisk =
        content === undefined
          ? undefined
          : hashObject({ type: "blob", content });
      return h?.oid !== i?.oid || h?.mode !== i?.mode || i?.oid !== onDisk;
    })
    .sort(compareBytes);
  const reset = checkoutPaths(
    created.world.objects,
    stashed.repo,
    machine,
    headFiles,
    paths,
  );
  const next = appendReflog(
    {
      ...reset.repo,
      origHead: head,
      arrival: [...repo.arrival, work.parents[1] as Oid, created.oid],
    },
    "HEAD",
    { old: head, new: head, who, message: "reset: moving to HEAD" },
  );
  const updated = withRepo(created.world, next);
  return {
    world:
      reset.fs === machine.fs
        ? updated
        : withMachine(updated, { ...machine, fs: reset.fs }),
    stdout: flag(options, "quiet") ? "" : m.saved(created.message),
    effects: [...created.effects, stashed.effect, ...reset.effects],
  };
}

function apply(
  ctx: Ctx,
  pop: boolean,
  name: string | undefined,
): CommandResult {
  const { world, machine, repo, options } = ctx;
  const quiet = flag(options, "quiet");
  const picked = pickStash(repo, name);
  if (picked === "empty") return refuse("no-operation", m.noEntries(), 1);
  if (picked === "invalid")
    return refuse("unknown-revision", m.notValid(name ?? ""), 1);
  const kept = pop ? m.kept() : "";
  const unmerged = conflictedPaths(repo.index);
  if (unmerged.length) {
    return refuse(
      "unmerged-paths",
      m.couldNotWriteIndex(),
      1,
      m.needsMerge(unmerged) + kept,
    );
  }
  const applied = applyStash(world, repo, machine, picked.oid);
  if (!applied.ok) {
    return {
      ...applied.result,
      stdout: (quiet ? "" : statusText(world, repo)) + kept,
    };
  }
  let after = applied.world;
  const effects = [...applied.effects];
  let dropped = "";
  if (pop && !applied.conflicted) {
    const removed = dropStash(after.repos.get(repo.id) as Repo, picked.index);
    after = withRepo(after, removed.repo);
    effects.push(...removed.effects);
    dropped = m.dropped(picked.label, picked.oid);
  }
  const status = quiet
    ? ""
    : statusText(after, after.repos.get(repo.id) as Repo);
  return {
    world: after,
    stdout: applied.lines + status + (applied.conflicted ? kept : dropped),
    exitCode: applied.conflicted ? 1 : 0,
    effects,
  };
}

function drop(ctx: Ctx, name: string | undefined): CommandResult {
  const { world, repo, options } = ctx;
  const picked = pickStash(repo, name);
  if (picked === "empty") return refuse("no-operation", m.noEntries(), 1);
  if (picked === "invalid")
    return refuse("unknown-revision", m.notValid(name ?? ""), 1);
  const removed = dropStash(repo, picked.index);
  return {
    world: withRepo(world, removed.repo),
    stdout: flag(options, "quiet") ? "" : m.dropped(picked.label, picked.oid),
    effects: removed.effects,
  };
}

function show(ctx: Ctx, name: string | undefined): CommandResult {
  const { world, repo, options } = ctx;
  const picked = pickStash(repo, name);
  if (picked === "empty") return refuse("no-operation", m.noEntries(), 1);
  if (picked === "invalid")
    return refuse("unknown-revision", m.notValid(name ?? ""), 1);
  const pool = world.objects;
  const stash = readObject(pool, picked.oid, "commit");
  const pairs = changedPairs(
    commitSnapshot(pool, stash.parents[0] ?? null),
    treeSnapshot(pool, stash.tree),
  );
  const patch = flag(options, "patch") && !flag(options, "stat");
  return {
    stdout: patch
      ? pairs.map((p) => unifiedDiff(pool, p)).join("")
      : diffStat(pairs),
  };
}

const SUBCOMMANDS = ["push", "save", "list", "show", "apply", "pop", "drop"];

export const stash = defineCommand({
  name: "stash",
  counted: true,
  needsRepo: true,
  usage: STASH_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const unsupported = refuseUnsimulated("stash", ctx.options);
    if (unsupported) return unsupported;
    const [sub = "push", ...rest] = ctx.options.args;
    if (!SUBCOMMANDS.includes(sub)) {
      return ["clear", "branch", "create", "store"].includes(sub)
        ? refuse("not-simulated", notSimulated(`git stash ${sub}`), 1)
        : refuse("usage", m.unknownSubcommand(sub), 129);
    }
    const [name] = rest;
    switch (sub) {
      case "list":
        return {
          stdout: stashEntries(ctx.repo)
            .map((e, i) => `stash@{${i}}: ${e.message}\n`)
            .join(""),
        };
      case "show":
        return show(ctx, name);
      case "apply":
      case "pop":
        return apply(ctx, sub === "pop", name);
      case "drop":
        return drop(ctx, name);
      default: {
        if (sub === "push" && rest.length) {
          return refuse(
            "not-simulated",
            notSimulated("git stash push <pathspec>"),
            1,
          );
        }
        const typed = stringValues(ctx.options, "message").at(-1);
        if (sub !== "save") return push(ctx, typed ?? null);
        const message = rest.length ? rest.join(" ") : (typed ?? null);
        const result = push(ctx, message);
        const modern = message === null ? "" : ` -m ${shellQuote(message)}`;
        return { ...result, notes: [m.legacySave(modern)] };
      }
    }
  },
});
