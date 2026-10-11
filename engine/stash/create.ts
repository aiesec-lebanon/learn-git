import { subjectOf } from "../commit/message";
import { resolveIdentity } from "../config/identity";
import { worktreeFiles } from "../files/worktree";
import { abbreviate } from "../objects/abbrev";
import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { buildTree, flattenTree, type TreeFile } from "../objects/tree";
import { writeObjects } from "../objects/write";
import { shortRefName } from "../refs/names";
import { headBranch, resolveHead } from "../refs/refs";
import { stagedFiles } from "../staging/index";
import type {
  Commit,
  Effect,
  GitObject,
  Machine,
  Oid,
  Repo,
  RepoPath,
  World,
} from "../types";

type Files = ReadonlyMap<RepoPath, TreeFile>;

const sameFiles = (a: Files, b: Files) =>
  a.size === b.size &&
  [...a].every(
    ([p, f]) => b.get(p)?.oid === f.oid && b.get(p)?.mode === f.mode,
  );

export type CreatedStash = {
  readonly world: World;
  /** The working-tree commit (its second parent is the index commit). */
  readonly oid: Oid;
  readonly effects: readonly Effect[];
  /** `WIP on main: abc1234 Subject` or `On main: <message>`. */
  readonly message: string;
};

/**
 * `git stash create`: an index commit and a working-tree commit on top of
 * HEAD recording local changes to tracked files; null when there are none.
 */
export function createStash(
  world: World,
  repo: Repo,
  machine: Machine,
  time: number,
  message: string | null = null,
): CreatedStash | null {
  const head = resolveHead(repo);
  const identity = resolveIdentity(world, machine, repo);
  if (!head || !identity.ok) return null;
  const pool = world.objects;
  const headCommit = readObject(pool, head, "commit");
  const headFiles = flattenTree(pool, headCommit.tree);
  const indexFiles = stagedFiles(repo.index);
  const disk = worktreeFiles(machine.fs, repo.workdir);
  const blobs: GitObject[] = [];
  const workFiles = new Map<RepoPath, TreeFile>();
  for (const [path, file] of indexFiles) {
    const content = disk.get(path);
    if (content === undefined) continue;
    const blob: GitObject = { type: "blob", content };
    blobs.push(blob);
    workFiles.set(path, { oid: hashObject(blob), mode: file.mode });
  }
  if (sameFiles(headFiles, indexFiles) && sameFiles(indexFiles, workFiles)) {
    return null;
  }
  const branch = headBranch(repo);
  const label = branch ? shortRefName(branch) : "(no branch)";
  const line = `${abbreviate(pool, head)} ${subjectOf(headCommit.message)}`;
  const sig = { ...identity.ident, time, tz: "+0000" };
  const commit = (tree: Oid, parents: Oid[], text: string): Commit => ({
    type: "commit",
    tree,
    parents,
    author: sig,
    committer: sig,
    message: text,
  });
  const indexTree = buildTree(indexFiles);
  const indexCommit = commit(
    indexTree.root,
    [head],
    `index on ${label}: ${line}\n`,
  );
  const workTree = buildTree(workFiles);
  const text =
    message === null ? `WIP on ${label}: ${line}` : `On ${label}: ${message}`;
  const work = commit(workTree.root, [head, hashObject(indexCommit)], text);
  const written = writeObjects(world, repo.id, [
    ...indexTree.trees,
    indexCommit,
    ...blobs,
    ...workTree.trees,
    work,
  ]);
  return {
    world: written.world,
    oid: hashObject(work),
    effects: written.effects,
    message: text,
  };
}
