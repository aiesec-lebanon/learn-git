import { detectRenames } from "../diff/renames";
import { worktreeFiles } from "../files/worktree";
import { ignoreRules } from "../ignore/rules";
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

/** Git's two-letter code for a conflicted path (`UU`, `AA`, `DU`, ...). */
export type UnmergedCode = "DD" | "AU" | "UD" | "UA" | "DU" | "AA" | "UU";

export type StatusData = {
  readonly unborn: boolean;
  /** Paths with conflict stages, in path order. */
  readonly unmerged: readonly {
    readonly path: RepoPath;
    readonly code: UnmergedCode;
  }[];
  /** HEAD against the index. */
  readonly staged: readonly FileChange[];
  /** The index against the working tree. */
  readonly unstaged: readonly FileChange[];
  readonly untracked: readonly RepoPath[];
  /** Untracked files a `.gitignore` rule hides. */
  readonly ignored: readonly RepoPath[];
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

const CODES: Readonly<Record<string, UnmergedCode>> = {
  "1": "DD",
  "2": "AU",
  "12": "UD",
  "3": "UA",
  "13": "DU",
  "23": "AA",
  "123": "UU",
};

/** Conflicted paths with the code their stages give. */
export function unmergedPaths(index: Index): StatusData["unmerged"] {
  return [...index]
    .filter(([, entries]) => entries.some((e) => e.stage > 0))
    .map(([path, entries]) => ({
      path,
      code:
        CODES[
          entries
            .map((e) => e.stage)
            .sort()
            .join("")
        ] ?? "UU",
    }))
    .sort((a, b) => compareBytes(a.path, b.path));
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
  const unmerged = unmergedPaths(repo.index);
  const conflicted = new Set<string>(unmerged.map((u) => u.path));
  const changes = compare(headFiles, staged).filter(
    (c) => !conflicted.has(c.path),
  );
  const rules = ignoreRules(files);
  const untracked: RepoPath[] = [];
  const ignored: RepoPath[] = [];
  for (const path of files.keys()) {
    if (repo.index.has(path)) continue;
    (rules.ignored(path) ? ignored : untracked).push(path);
  }
  const result: StatusData = {
    unborn: head === null,
    unmerged,
    staged: changes,
    unstaged,
    untracked,
    ignored,
    renames: stagedRenames(pool, headFiles, staged, changes),
  };
  byKey.set(key, result);
  return result;
}

function foldersOf(paths: Iterable<string>): Set<string> {
  const folders = new Set<string>();
  for (const path of paths) {
    for (let cut = path.indexOf("/"); cut > 0; cut = path.indexOf("/", cut + 1))
      folders.add(path.slice(0, cut));
  }
  return folders;
}

/** Each path, or the topmost folder above it that `folds` accepts, as `folder/`. */
function fold(paths: readonly string[], folds: (dir: string) => boolean) {
  const shown = new Set<string>();
  for (const path of paths) {
    let display = path;
    for (
      let cut = path.indexOf("/");
      cut > 0;
      cut = path.indexOf("/", cut + 1)
    ) {
      const dir = path.slice(0, cut);
      if (folds(dir)) {
        display = `${dir}/`;
        break;
      }
    }
    shown.add(display);
  }
  return [...shown].sort(compareBytes);
}

/**
 * Untracked paths as Git lists them: a folder holding no tracked file
 * collapses to `folder/` (its topmost such folder).
 */
export function collapseUntracked(
  untracked: readonly RepoPath[],
  index: Index,
): string[] {
  const tracked = foldersOf(index.keys());
  return fold(untracked, (dir) => !tracked.has(dir));
}

/** Ignored paths as `--ignored` lists them: a folder holding only ignored files collapses. */
export function collapseIgnored(
  ignored: readonly RepoPath[],
  untracked: readonly RepoPath[],
  index: Index,
): string[] {
  const kept = foldersOf([...index.keys(), ...untracked]);
  return fold(ignored, (dir) => !kept.has(dir));
}
