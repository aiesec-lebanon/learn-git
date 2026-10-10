import type { Fs, RepoPath } from "../types";
import { compareBytes } from "../util/compare";
import { ancestors, baseName, parentOf, relativeTo } from "./paths";

export const isGitPath = (path: string) => path.split("/").includes(".git");

export function writeFile(fs: Fs, path: string, content: string): Fs {
  const dirs = ancestors(path).every((d) => fs.dirs.has(d))
    ? fs.dirs
    : new Set([...fs.dirs, ...ancestors(path)]);
  return { files: new Map(fs.files).set(path, content), dirs };
}

export function removeFile(fs: Fs, path: string): Fs {
  const files = new Map(fs.files);
  files.delete(path);
  return { files, dirs: fs.dirs };
}

export function makeDir(fs: Fs, path: string): Fs {
  if (fs.dirs.has(path)) return fs;
  return {
    files: fs.files,
    dirs: new Set([...fs.dirs, ...ancestors(path), path]),
  };
}

/** Removes a directory and everything below it. */
export function removeTree(fs: Fs, path: string): Fs {
  const inside = (p: string) => p === path || relativeTo(path, p) !== null;
  return {
    files: new Map([...fs.files].filter(([p]) => !inside(p))),
    dirs: new Set([...fs.dirs].filter((d) => !inside(d))),
  };
}

/** Names directly inside `dir`, sorted by bytes, each marked as a folder or not. */
export function listDir(fs: Fs, dir: string): { name: string; dir: boolean }[] {
  const out = [
    ...[...fs.dirs]
      .filter((d) => d !== dir && parentOf(d) === dir)
      .map((d) => ({ name: baseName(d), dir: true })),
    ...[...fs.files.keys()]
      .filter((f) => parentOf(f) === dir)
      .map((f) => ({ name: baseName(f), dir: false })),
  ];
  return out.sort((a, b) => compareBytes(a.name, b.name));
}

const worktreeMemo = new WeakMap<
  Fs,
  Map<string, ReadonlyMap<RepoPath, string>>
>();

/** Files of the worktree rooted at `workdir`, by repository path, outside `.git`. */
export function worktreeFiles(
  fs: Fs,
  workdir: string,
): ReadonlyMap<RepoPath, string> {
  let byRoot = worktreeMemo.get(fs);
  if (!byRoot) {
    byRoot = new Map();
    worktreeMemo.set(fs, byRoot);
  }
  let files = byRoot.get(workdir);
  if (!files) {
    const found: [RepoPath, string][] = [];
    for (const [path, content] of fs.files) {
      const rel = relativeTo(workdir, path);
      if (rel && !isGitPath(rel)) found.push([rel as RepoPath, content]);
    }
    files = new Map(found.sort(([a], [b]) => compareBytes(a, b)));
    byRoot.set(workdir, files);
  }
  return files;
}
