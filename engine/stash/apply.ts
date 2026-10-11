import type { CommandResult } from "../commands/registry";
import { applyTreeMerge, commitFiles } from "../merge/three-way";
import { readObject } from "../objects/pool";
import { flattenTree, sameFiles } from "../objects/tree";
import { indexChanges, stagedFiles } from "../staging/index";
import type {
  Effect,
  Index,
  IndexEntry,
  Machine,
  Oid,
  Repo,
  RepoPath,
  World,
} from "../types";
import { withRepo } from "../world/access";

export type Applied =
  | {
      readonly ok: true;
      readonly world: World;
      readonly effects: readonly Effect[];
      /** Ort's `Auto-merging` and `CONFLICT` lines. */
      readonly lines: string;
      readonly conflicted: boolean;
    }
  | { readonly ok: false; readonly result: CommandResult };

/**
 * `git stash apply`: merges the stash's working-tree commit into the index
 * and working tree (base: the commit it was made on). On success the index
 * returns to what it was, except files the stash added; on a conflict the
 * merged index and conflict stages stay.
 */
export function applyStash(
  world: World,
  repo: Repo,
  machine: Machine,
  oid: Oid,
): Applied {
  const pool = world.objects;
  const stash = readObject(pool, oid, "commit");
  const base = commitFiles(pool, stash.parents[0] ?? null);
  const ours = stagedFiles(repo.index);
  const merged = applyTreeMerge(
    world,
    repo,
    machine,
    { base, ours, theirs: flattenTree(pool, stash.tree) },
    {
      ours: sameFiles(base, ours)
        ? "Version stash was based on"
        : "Updated upstream",
      theirs: "Stashed changes",
      base: "Stash base",
    },
    ours,
  );
  if (!merged.ok) return merged;
  let index: Index = merged.repo.index;
  if (!merged.conflicts.length) {
    const kept = new Map<RepoPath, readonly IndexEntry[]>();
    for (const [path, file] of ours) {
      kept.set(path, [{ path, ...file, stage: 0 }]);
    }
    for (const [path, entries] of merged.repo.index) {
      if (!ours.has(path)) kept.set(path, entries);
    }
    index = kept;
  }
  const changes = indexChanges(repo.index, index);
  const effects: Effect[] = merged.effects.filter(
    (e) => e.kind !== "index-changed",
  );
  if (changes.length) {
    effects.push({
      kind: "index-changed",
      repo: repo.id,
      from: "commit",
      changes,
    });
  }
  return {
    ok: true,
    world: withRepo(merged.world, { ...merged.repo, index }),
    effects,
    lines: merged.lines,
    conflicted: merged.conflicts.length > 0,
  };
}
