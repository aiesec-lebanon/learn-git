import { detectRenames } from "../diff/renames";
import { worktreeFiles } from "../files/worktree";
import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { flattenTree, type TreeFile } from "../objects/tree";
import { resolveHead } from "../refs/refs";
import { stagedFiles } from "../staging/index";
import type { Fs, Index, ObjectPool, Repo, RepoPath } from "../types";
import { compareBytes } from "../util/compare";

export type FileChange = {
  readonly path: RepoPath;
  readonly kind: "added" | "modified" | "deleted";
};

export type StatusData = {
  readonly unborn: boolean;
  /** HEAD against the index. */
  readonly staged: readonly FileChange[];
  /** The index against the working tree. */
  readonly unstaged: readonly FileChange[];
  readonly untracked: readonly RepoPath[];
  /** Staged deletions and additions Git shows as renames. */
  readonly renames: readonly {
    readonly from: RepoPath;
    readonly to: RepoPath;
  }[];
};

function stagedRenames(
  pool: ObjectPool,
  head: ReadonlyMap<RepoPath, TreeFile>,
  staged: ReadonlyMap<RepoPath, TreeFile>,
  changes: readonly FileChange[],
): StatusData["renames"] {
  const file = (t: TreeFile | undefined) =>
    t ? { ...t, content: readObject(pool, t.oid, "blob").content } : null;
  const pairs = changes
    .filter((c) => c.kind !== "modified")
    .map((c) => ({
      path: c.path,
      before: c.kind === "deleted" ? file(head.get(c.path)) : null,
      after: c.kind === "added" ? file(staged.get(c.path)) : null,
    }));
  return detectRenames(pairs).flatMap((p) =>
    p.from === undefined
      ? []
      : [{ from: p.from as RepoPath, to: p.path as RepoPath }],
  );
}

function compare(
  before: ReadonlyMap<RepoPath, TreeFile>,
  after: ReadonlyMap<RepoPath, TreeFile>,
): FileChange[] {
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort(
    compareBytes,
  );
  const changes: FileChange[] = [];
  for (const path of paths) {
    const a = before.get(path);
    const b = after.get(path);
    if (!a) changes.push({ path, kind: "added" });
    else if (!b) changes.push({ path, kind: "deleted" });
    else if (a.oid !== b.oid || a.mode !== b.mode)
      changes.push({ path, kind: "modified" });
  }
  return changes;
}

const memo = new WeakMap<Index, WeakMap<Fs, Map<string, StatusData>>>();

/** The three-way comparison behind `git status`, memoized per snapshot. */
export function computeStatus(
  pool: ObjectPool,
  repo: Repo,
  fs: Fs,
): StatusData {
  const head = resolveHead(repo);
  const key = `${repo.workdir}\0${head ?? ""}`;
  let byFs = memo.get(repo.index);
  if (!byFs) {
    byFs = new WeakMap();
    memo.set(repo.index, byFs);
  }
  let byKey = byFs.get(fs);
  if (!byKey) {
    byKey = new Map();
    byFs.set(fs, byKey);
  }
  const cached = byKey.get(key);
  if (cached) return cached;
  const headFiles: ReadonlyMap<RepoPath, TreeFile> = head
    ? flattenTree(pool, readObject(pool, head, "commit").tree)
    : new Map();
  const staged = stagedFiles(repo.index);
  const files = worktreeFiles(fs, repo.workdir);
  const unstaged: FileChange[] = [];
  for (const [path, entry] of staged) {
    const content = files.get(path);
    if (content === undefined) unstaged.push({ path, kind: "deleted" });
    else if (hashObject({ type: "blob", content }) !== entry.oid) {
      unstaged.push({ path, kind: "modified" });
    }
  }
  const changes = compare(headFiles, staged);
  const result: StatusData = {
    unborn: head === null,
    staged: changes,
    unstaged,
    untracked: [...files.keys()].filter((p) => !repo.index.has(p)),
    renames: stagedRenames(pool, headFiles, staged, changes),
  };
  byKey.set(key, result);
  return result;
}

/**
 * Untracked paths as Git lists them: a folder holding no tracked file
 * collapses to `folder/` (its topmost such folder).
 */
export function collapseUntracked(
  untracked: readonly RepoPath[],
  index: Index,
): string[] {
  const trackedDirs = new Set<string>();
  for (const path of index.keys()) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++)
      trackedDirs.add(parts.slice(0, i).join("/"));
  }
  const shown = new Set<string>();
  for (const path of untracked) {
    const parts = path.split("/");
    let display: string = path;
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      if (!trackedDirs.has(dir)) {
        display = `${dir}/`;
        break;
      }
    }
    shown.add(display);
  }
  return [...shown].sort(compareBytes);
}
