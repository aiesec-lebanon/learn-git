import { twoWayUpdate } from "../checkout/two-way";
import type { CommandResult } from "../commands/registry";
import { refuse } from "../commands/registry";
import { reflogWho, resolveIdentity } from "../config/identity";
import { configValue } from "../config/scopes";
import { notSimulated } from "../messages/git";
import { mergeMessages as m } from "../messages/merge";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { buildTree, flattenTree, type TreeFile } from "../objects/tree";
import { writeObjects } from "../objects/write";
import { appendReflog } from "../refs/reflog";
import { conflictedPaths, stagedFiles } from "../staging/index";
import type {
  Commit,
  Effect,
  Fs,
  Index,
  IndexEntry,
  Machine,
  ObjectPool,
  Oid,
  Repo,
  RepoPath,
  World,
} from "../types";
import { withEntry } from "../util/cow";
import { compareBytes } from "../util/compare";
import { withMachine, withRepo } from "../world/access";
import { createStash } from "../stash/create";
import { mergeBases } from "./base";
import {
  advanceHead,
  conflictMessage,
  defaultMergeMessage,
  mergeStat,
} from "./conclude";
import type { ConflictStyle, MergeLabels } from "./file";
import { mergeTrees, type Files } from "./tree";

export const commitFiles = (pool: ObjectPool, oid: Oid | null): Files =>
  oid ? flattenTree(pool, readObject(pool, oid, "commit").tree) : new Map();

/** `merge.conflictStyle`, defaulting to Git's `merge`. */
export function conflictStyle(
  world: World,
  machine: Machine,
  repo: Repo,
): ConflictStyle {
  const value = configValue(world, machine, repo, "merge.conflictstyle");
  return value === "diff3" || value === "zdiff3" ? value : "merge";
}

/** Paths whose index entry differs from `head` (Git's "index has changes"). */
export function stagedChanges(index: Index, head: Files): RepoPath[] {
  const staged = stagedFiles(index);
  const conflicted = new Set(conflictedPaths(index));
  const paths = new Set([...head.keys(), ...staged.keys(), ...conflicted]);
  return [...paths]
    .filter((p) => {
      const a = head.get(p);
      const b = staged.get(p);
      return conflicted.has(p) || a?.oid !== b?.oid || a?.mode !== b?.mode;
    })
    .sort(compareBytes);
}

type Applied =
  | {
      readonly ok: true;
      readonly world: World;
      readonly repo: Repo;
      readonly effects: readonly Effect[];
      readonly lines: string;
      readonly conflicts: readonly RepoPath[];
    }
  | { readonly ok: false; readonly result: CommandResult };

/**
 * Merges `theirs` into the index and working tree on top of `ours` (from
 * `base`): writes the merged files and leaves conflict stages, or refuses
 * when local changes or untracked files are in the way.
 */
export function applyTreeMerge(
  world: World,
  repo: Repo,
  machine: Machine,
  trees: { base: Files; ours: Files; theirs: Files },
  labels: MergeLabels,
): Applied {
  const style = conflictStyle(world, machine, repo);
  const merged = mergeTrees(world.objects, trees, labels, style);
  if (!merged.ok) {
    return {
      ok: false,
      result: refuse(
        "not-simulated",
        notSimulated(
          `merging ${merged.tooLarge} (file too large for the sandbox)`,
        ),
        1,
      ),
    };
  }
  const result = new Map<RepoPath, TreeFile>(trees.ours);
  for (const [path, outcome] of merged.outcomes) {
    const file = outcome.kind === "clean" ? outcome.file : outcome.worktree;
    if (file) result.set(path, file);
    else result.delete(path);
  }
  // Ort writes its result tree, conflict markers included.
  const written = writeObjects(world, repo.id, [
    ...merged.blobs,
    ...buildTree(result).trees,
  ]);
  const moved = twoWayUpdate(written.world, repo, machine, result, "merge");
  if (!moved.ok) return { ok: false, result: moved.refusal };
  let index = moved.repo.index;
  for (const path of merged.conflicts) {
    const outcome = merged.outcomes.get(path);
    if (outcome?.kind !== "conflict") continue;
    const entries: IndexEntry[] = [...outcome.stages].map(([stage, file]) => ({
      path,
      ...file,
      stage,
    }));
    index = withEntry(index, path, entries);
  }
  const effects: Effect[] = [...written.effects, ...moved.effects];
  if (merged.conflicts.length) {
    effects.push(
      {
        kind: "index-changed",
        repo: repo.id,
        from: "commit",
        changes: merged.conflicts.map((path) => ({
          path,
          change: repo.index.has(path) ? "modified" : "added",
        })),
      },
      { kind: "conflict", repo: repo.id, paths: merged.conflicts },
    );
  }
  const next = { ...moved.repo, index };
  const nextWorld = withRepo(written.world, next);
  return {
    ok: true,
    world:
      moved.fs === machine.fs
        ? nextWorld
        : withMachine(nextWorld, { ...machine, fs: moved.fs as Fs }),
    repo: next,
    effects,
    lines: merged.lines.join(""),
    conflicts: merged.conflicts,
  };
}

export type MergeRequest = {
  readonly world: World;
  readonly machine: Machine;
  /** The repository with `ORIG_HEAD` already recorded. */
  readonly repo: Repo;
  readonly time: number;
  readonly head: Oid;
  readonly theirs: Oid;
  readonly typed: string;
  /** From `-m`; null for Git's default message. */
  readonly message: string | null;
  readonly quiet: boolean;
  readonly allowUnrelated: boolean;
};

const FAILED = "Merge with strategy ort failed.\n";

/** A true merge (ort): a merge commit, or a merge paused on conflicts. */
export function threeWayMerge(req: MergeRequest): CommandResult {
  const bases = mergeBases(req.world.objects, req.head, req.theirs);
  if (!bases.length && !req.allowUnrelated) {
    return {
      ...refuse("usage", m.unrelated()),
      world: withRepo(req.world, req.repo),
    };
  }
  if (bases.length > 1) {
    return refuse(
      "not-simulated",
      notSimulated(
        "merges with more than one merge base (criss-cross history)",
      ),
      1,
    );
  }
  // Git saves local changes with `git stash create` before merging.
  const saved = createStash(req.world, req.repo, req.machine, req.time);
  const world = saved?.world ?? req.world;
  const result = mergeOnto({ ...req, world }, bases[0] ?? null);
  return saved
    ? {
        ...result,
        world: result.world ?? world,
        effects: [...saved.effects, ...(result.effects ?? [])],
      }
    : result;
}

function mergeOnto(req: MergeRequest, base: Oid | null): CommandResult {
  const { world, machine, repo, head, theirs, typed, time } = req;
  const pool = world.objects;
  const ours = commitFiles(pool, head);
  const who = reflogWho(world, machine, repo, time);
  const staged = stagedChanges(repo.index, ours);
  if (staged.length) {
    const logged = appendReflog(repo, "HEAD", {
      old: head,
      new: head,
      who,
      message: `merge ${typed}: updating HEAD`,
    });
    return {
      ...refuse("would-lose-changes", m.indexHasChanges(staged) + FAILED, 2),
      world: withRepo(world, logged),
    };
  }
  const applied = applyTreeMerge(
    world,
    repo,
    machine,
    {
      base: commitFiles(pool, base),
      ours,
      theirs: commitFiles(pool, theirs),
    },
    {
      ours: "HEAD",
      theirs: typed,
      base: base ? abbreviate(pool, base) : "empty tree",
    },
  );
  if (!applied.ok) {
    const { result } = applied;
    if (result.exitCode !== 1 || !result.stderr?.endsWith("Aborting\n")) {
      return result;
    }
    return {
      ...result,
      stderr: result.stderr + FAILED,
      exitCode: 2,
      world: withRepo(world, repo),
    };
  }
  const message = req.message ?? defaultMergeMessage(repo, typed);
  if (applied.conflicts.length) {
    const paused: Repo = {
      ...applied.repo,
      op: {
        kind: "merge",
        head: theirs,
        message: conflictMessage(message, applied.conflicts),
      },
    };
    return {
      world: withRepo(applied.world, paused),
      stdout: applied.lines + m.automaticFailed(),
      exitCode: 1,
      effects: [
        ...applied.effects,
        {
          kind: "operation",
          repo: repo.id,
          operation: "merge",
          phase: "started",
        },
        {
          kind: "operation",
          repo: repo.id,
          operation: "merge",
          phase: "paused",
        },
      ],
    };
  }
  const identity = resolveIdentity(world, machine, repo);
  if (!identity.ok) return refuse("identity-unknown", identity.stderr);
  const sig = { ...identity.ident, time, tz: "+0000" };
  const { root, trees } = buildTree(stagedFiles(applied.repo.index));
  const commit: Commit = {
    type: "commit",
    tree: root,
    parents: [head, theirs],
    author: sig,
    committer: sig,
    message,
  };
  const written = writeObjects(applied.world, repo.id, [...trees, commit]);
  const oid = written.oids.at(-1) as Oid;
  const advanced = advanceHead(
    { ...applied.repo, arrival: [...applied.repo.arrival, oid] },
    oid,
    who,
    `merge ${typed}: Merge made by the 'ort' strategy.`,
  );
  const summary = req.quiet
    ? ""
    : m.madeBy() + mergeStat(written.world.objects, head, oid);
  return {
    world: withRepo(written.world, advanced.repo),
    stdout: applied.lines + summary,
    effects: [...applied.effects, ...written.effects, advanced.effect],
  };
}
