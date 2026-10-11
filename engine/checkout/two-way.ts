import { refuse, type CommandResult } from "../commands/registry";
import { ancestors, resolvePath } from "../files/paths";
import { quotePath } from "../files/quote";
import { removeFilePruning, worktreeFiles, writeFile } from "../files/worktree";
import { checkoutMessages as m } from "../messages/checkout";
import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { flattenTree, type TreeFile } from "../objects/tree";
import { resolveHead } from "../refs/refs";
import { stageEntry, stagedFiles, unstagePath } from "../staging/index";
import { computeStatus } from "../status/compute";
import type {
  Effect,
  Fs,
  Machine,
  ObjectPool,
  Oid,
  PathChange,
  Repo,
  RepoPath,
  World,
} from "../types";
import { compareBytes } from "../util/compare";

export type Files = ReadonlyMap<RepoPath, TreeFile>;

const treeOf = (pool: ObjectPool, oid: Oid | null): Files =>
  oid ? flattenTree(pool, readObject(pool, oid, "commit").tree) : new Map();

const same = (a: TreeFile | undefined, b: TreeFile | undefined) =>
  a?.oid === b?.oid && a?.mode === b?.mode;

export type TwoWay =
  | {
      readonly ok: true;
      readonly repo: Repo;
      readonly fs: Fs;
      readonly effects: readonly Effect[];
    }
  | { readonly ok: false; readonly refusal: CommandResult };

/**
 * Moves the index and working tree from HEAD's commit to `target` the way
 * `git switch` does: paths that are the same in both keep local changes;
 * other paths update only when they hold no local changes.
 */
export function twoWayCheckout(
  world: World,
  repo: Repo,
  machine: Machine,
  target: Oid,
): TwoWay {
  return twoWayUpdate(world, repo, machine, treeOf(world.objects, target));
}

/** The same move to a set of files (a merge result) instead of a commit. */
export function twoWayUpdate(
  world: World,
  repo: Repo,
  machine: Machine,
  next: Files,
  action: "checkout" | "merge" = "checkout",
): TwoWay {
  const pool = world.objects;
  const head = treeOf(pool, resolveHead(repo));
  const index = stagedFiles(repo.index);
  const files = worktreeFiles(machine.fs, repo.workdir);
  const status = computeStatus(pool, repo, machine.fs);
  const untracked = new Set<RepoPath>(status.untracked);
  const paths = [
    ...new Set([...head.keys(), ...next.keys(), ...index.keys()]),
  ].sort(compareBytes);
  const local: RepoPath[] = [];
  const blocking: RepoPath[] = [];
  const updates: RepoPath[] = [];
  for (const path of paths) {
    const h = head.get(path);
    const t = next.get(path);
    const i = index.get(path);
    if (same(h, t) || same(i, t)) continue;
    if (!same(i, h)) {
      local.push(path);
      continue;
    }
    const content = files.get(path);
    if (i && content !== undefined) {
      if (hashObject({ type: "blob", content }) !== i.oid) local.push(path);
      else updates.push(path);
    } else if (!i && untracked.has(path)) blocking.push(path);
    else updates.push(path);
  }
  if (local.length || blocking.length) {
    return {
      ok: false,
      refusal: refuse(
        "would-lose-changes",
        m.wouldOverwrite(local, blocking, action),
        1,
      ),
    };
  }
  return {
    ok: true,
    ...checkoutPaths(world.objects, repo, machine, next, updates),
  };
}

/**
 * Writes `paths` from `next` into the index (stage 0) and working tree,
 * removing those `next` lacks; no safety checks (the caller made them).
 */
export function checkoutPaths(
  pool: ObjectPool,
  repo: Repo,
  machine: Machine,
  next: Files,
  paths: readonly RepoPath[],
): { repo: Repo; fs: Fs; effects: Effect[] } {
  const files = worktreeFiles(machine.fs, repo.workdir);
  let nextIndex = repo.index;
  let fs = machine.fs;
  const indexChanges: PathChange[] = [];
  const fileChanges: (PathChange & { node: "file" | "dir" })[] = [];
  for (const path of paths) {
    const t = next.get(path);
    const absolute = resolvePath(repo.workdir, path);
    const had = files.get(path);
    if (t) {
      nextIndex = stageEntry(nextIndex, { path, ...t, stage: 0 });
      indexChanges.push({
        path,
        change: repo.index.has(path) ? "modified" : "added",
      });
      const content = readObject(pool, t.oid, "blob").content;
      if (had !== content) {
        const current = fs;
        fileChanges.push(
          ...ancestors(absolute)
            .filter((dir) => !current.dirs.has(dir))
            .map((dir) => ({
              path: dir,
              change: "added" as const,
              node: "dir" as const,
            })),
        );
        fs = writeFile(fs, absolute, content);
        fileChanges.push({
          path: absolute,
          change: had === undefined ? "added" : "modified",
          node: "file",
        });
      }
    } else {
      nextIndex = unstagePath(nextIndex, path);
      if (repo.index.has(path)) indexChanges.push({ path, change: "deleted" });
      if (had !== undefined) {
        const pruned = removeFilePruning(fs, absolute, repo.workdir);
        fs = pruned.fs;
        fileChanges.push(
          { path: absolute, change: "deleted", node: "file" },
          ...pruned.removedDirs.map((dir) => ({
            path: dir,
            change: "deleted" as const,
            node: "dir" as const,
          })),
        );
      }
    }
  }
  const effects: Effect[] = [];
  if (indexChanges.length) {
    effects.push({
      kind: "index-changed",
      repo: repo.id,
      from: "commit",
      changes: indexChanges,
    });
  }
  if (fileChanges.length) {
    effects.push({
      kind: "files-changed",
      machine: machine.id,
      changes: fileChanges,
    });
  }
  return { repo: { ...repo, index: nextIndex }, fs, effects };
}

/** `M\tpath` lines for what differs from `commit` after a switch (Git's local changes). */
export function localChanges(
  pool: ObjectPool,
  repo: Repo,
  fs: Fs,
  commit: Oid | null,
): string {
  const tree = treeOf(pool, commit);
  const index = stagedFiles(repo.index);
  const files = worktreeFiles(fs, repo.workdir);
  const paths = [...new Set([...tree.keys(), ...index.keys()])].sort(
    compareBytes,
  );
  return paths
    .flatMap((path) => {
      const t = tree.get(path);
      const i = index.get(path);
      const content = files.get(path);
      let letter: string | null = null;
      if (!i || content === undefined) letter = t ? "D" : null;
      else if (!t) letter = "A";
      else if (
        t.mode !== i.mode ||
        hashObject({ type: "blob", content }) !== t.oid
      ) {
        letter = "M";
      }
      return letter ? [`${letter}\t${quotePath(path)}\n`] : [];
    })
    .join("");
}
