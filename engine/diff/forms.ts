import { worktreeFiles } from "../files/worktree";
import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import { matchesPathspec, type Pathspec } from "../pathspec";
import { stagedFiles } from "../staging/index";
import type { Fs, ObjectPool, Oid, Repo, RepoPath } from "../types";
import { compareBytes } from "../util/compare";
import type { DiffFile, FilePair } from "./unified";

export type DiffArea = "commit" | "index" | "worktree";

/** Which two snapshots each `git diff` form compares (the diff lens reads this too). */
export const DIFF_FORMS = {
  unstaged: { form: "git diff", from: "index", to: "worktree" },
  staged: { form: "git diff --staged", from: "commit", to: "index" },
  commit: { form: "git diff <commit>", from: "commit", to: "worktree" },
  commits: { form: "git diff <commit> <commit>", from: "commit", to: "commit" },
} as const satisfies Record<
  string,
  { form: string; from: DiffArea; to: DiffArea }
>;

export type DiffFormId = keyof typeof DIFF_FORMS;

export function diffForm(staged: boolean, commits: number): DiffFormId {
  if (commits === 2) return "commits";
  if (staged) return "staged";
  return commits === 1 ? "commit" : "unstaged";
}

export type Snapshot = ReadonlyMap<RepoPath, DiffFile>;

/** A tree's files (null = the empty tree). */
export function treeSnapshot(pool: ObjectPool, tree: Oid | null): Snapshot {
  const out = new Map<RepoPath, DiffFile>();
  if (!tree) return out;
  for (const [path, file] of flattenTree(pool, tree)) {
    out.set(path, {
      ...file,
      content: readObject(pool, file.oid, "blob").content,
    });
  }
  return out;
}

/** A commit's files (null = the empty tree of an unborn branch). */
export function commitSnapshot(pool: ObjectPool, oid: Oid | null): Snapshot {
  return treeSnapshot(pool, oid && readObject(pool, oid, "commit").tree);
}

export function indexSnapshot(pool: ObjectPool, repo: Repo): Snapshot {
  const out = new Map<RepoPath, DiffFile>();
  for (const [path, file] of stagedFiles(repo.index)) {
    out.set(path, {
      ...file,
      content: readObject(pool, file.oid, "blob").content,
    });
  }
  return out;
}

/** Tracked files as they are on disk; a tracked file missing on disk is absent. */
export function worktreeSnapshot(repo: Repo, fs: Fs): Snapshot {
  const files = worktreeFiles(fs, repo.workdir);
  const out = new Map<RepoPath, DiffFile>();
  for (const [path, entry] of stagedFiles(repo.index)) {
    const content = files.get(path);
    if (content === undefined) continue;
    out.set(path, {
      oid: hashObject({ type: "blob", content }),
      mode: entry.mode,
      content,
    });
  }
  return out;
}

/** Changed files between two snapshots in path order, limited by pathspecs. */
export function changedPairs(
  before: Snapshot,
  after: Snapshot,
  specs: readonly Pathspec[] = [],
): FilePair[] {
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort(
    compareBytes,
  );
  const pairs: FilePair[] = [];
  for (const path of paths) {
    if (specs.length && !specs.some((s) => matchesPathspec(s, path))) continue;
    const a = before.get(path) ?? null;
    const b = after.get(path) ?? null;
    if (a?.oid === b?.oid && a?.mode === b?.mode) continue;
    pairs.push({ path, before: a, after: b });
  }
  return pairs;
}
