import type { TreeFile } from "../objects/tree";
import type { Index, IndexEntry, RepoPath } from "../types";
import { compareBytes } from "../util/compare";
import { withEntry, withoutEntry } from "../util/cow";

export const EMPTY_INDEX: Index = new Map();

/** The stage-0 entry for a path (none while the path is conflicted). */
export function stagedEntry(
  index: Index,
  path: RepoPath,
): IndexEntry | undefined {
  return index.get(path)?.find((e) => e.stage === 0);
}

/** Stages one resolved entry, replacing any conflict stages for the path. */
export function stageEntry(index: Index, entry: IndexEntry): Index {
  return withEntry(index, entry.path, [entry]);
}

export function unstagePath(index: Index, path: RepoPath): Index {
  return withoutEntry(index, path);
}

const sortedMemo = new WeakMap<Index, readonly IndexEntry[]>();

/** Every entry in Git's index order: path bytes, then stage. */
export function indexEntries(index: Index): readonly IndexEntry[] {
  let sorted = sortedMemo.get(index);
  if (!sorted) {
    sorted = [...index.values()]
      .flat()
      .sort((a, b) => compareBytes(a.path, b.path) || a.stage - b.stage);
    sortedMemo.set(index, sorted);
  }
  return sorted;
}

/** Stage-0 files in index order, ready for `buildTree`. */
export function stagedFiles(index: Index): ReadonlyMap<RepoPath, TreeFile> {
  return new Map(
    indexEntries(index)
      .filter((e) => e.stage === 0)
      .map((e) => [e.path, { oid: e.oid, mode: e.mode }]),
  );
}

export function conflictedPaths(index: Index): readonly RepoPath[] {
  return [
    ...new Set(
      indexEntries(index)
        .filter((e) => e.stage > 0)
        .map((e) => e.path),
    ),
  ];
}
