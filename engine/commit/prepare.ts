import { worktreeFiles } from "../files/worktree";
import { hashObject } from "../objects/hash";
import type { TreeFile } from "../objects/tree";
import { matchesPathspec, type Pathspec } from "../pathspec";
import { stageEntry, stagedFiles, unstagePath } from "../staging/index";
import type {
  Fs,
  GitObject,
  Index,
  PathChange,
  Repo,
  RepoPath,
} from "../types";

export type PreparedCommit = {
  /** The files the commit records. */
  readonly files: ReadonlyMap<RepoPath, TreeFile>;
  /** The real index afterwards. */
  readonly index: Index;
  readonly blobs: readonly GitObject[];
  readonly changes: readonly PathChange[];
};

/** Stages the worktree version of `paths` (removing those deleted on disk). */
function stageFromWorktree(
  index: Index,
  files: ReadonlyMap<RepoPath, string>,
  paths: readonly RepoPath[],
) {
  const blobs: GitObject[] = [];
  const changes: PathChange[] = [];
  let next = index;
  for (const path of paths) {
    const content = files.get(path);
    if (content === undefined) {
      next = unstagePath(next, path);
      changes.push({ path, change: "deleted" });
      continue;
    }
    const blob: GitObject = { type: "blob", content };
    const oid = hashObject(blob);
    const entry = next.get(path)?.[0];
    if (entry?.oid === oid) continue;
    blobs.push(blob);
    next = stageEntry(next, { path, oid, mode: "100644", stage: 0 });
    changes.push({ path, change: "modified" });
  }
  return { index: next, blobs, changes };
}

/** `git commit -a`: every tracked file as it is on disk, staged for real. */
export function prepareAll(repo: Repo, fs: Fs): PreparedCommit {
  const staged = stageFromWorktree(
    repo.index,
    worktreeFiles(fs, repo.workdir),
    [...stagedFiles(repo.index).keys()],
  );
  return { ...staged, files: stagedFiles(staged.index) };
}

/**
 * `git commit <paths>` (`--only`): HEAD's files plus the named tracked
 * files as they are on disk; those paths are also updated in the index.
 * Returns the pathspecs that match no tracked file instead, if any.
 */
export function prepareOnly(
  repo: Repo,
  fs: Fs,
  head: ReadonlyMap<RepoPath, TreeFile>,
  specs: readonly Pathspec[],
): PreparedCommit | { readonly unmatched: readonly Pathspec[] } {
  const tracked = [...stagedFiles(repo.index).keys()];
  const unmatched = specs.filter(
    (s) => !tracked.some((p) => matchesPathspec(s, p)),
  );
  if (unmatched.length) return { unmatched };
  const named = tracked.filter((p) => specs.some((s) => matchesPathspec(s, p)));
  const staged = stageFromWorktree(
    repo.index,
    worktreeFiles(fs, repo.workdir),
    named,
  );
  const after = stagedFiles(staged.index);
  const files = new Map(head);
  for (const path of named) {
    const file = after.get(path);
    if (file) files.set(path, file);
    else files.delete(path);
  }
  return { ...staged, files };
}
