import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import { matchesPathspec, type Pathspec } from "../pathspec";
import type { Commit, ObjectPool, Oid } from "../types";
import type { WalkStep } from "./walk";

/**
 * Git's default history simplification for `log -- <path>`: a commit is
 * listed when it is not TREESAME to its parent (for the given paths); a
 * merge TREESAME to a parent is hidden and only that parent is followed.
 */
export function pathSimplifier(
  pool: ObjectPool,
  specs: readonly Pathspec[],
): (oid: Oid, commit: Commit) => WalkStep {
  const memo = new Map<Oid, string>();
  const limited = (tree: Oid) => {
    let key = memo.get(tree);
    if (key === undefined) {
      key = [...flattenTree(pool, tree)]
        .filter(([path]) => specs.some((s) => matchesPathspec(s, path)))
        .map(([path, f]) => `${path}\0${f.oid}\0${f.mode}`)
        .join("\n");
      memo.set(tree, key);
    }
    return key;
  };
  const treeOf = (oid: Oid) => readObject(pool, oid, "commit").tree;
  return (_oid, commit) => {
    const own = limited(commit.tree);
    if (commit.parents.length === 0) return { show: own !== "", parents: [] };
    const same = commit.parents.find((p) => limited(treeOf(p)) === own);
    if (commit.parents.length === 1) {
      return { show: same === undefined, parents: commit.parents };
    }
    return same === undefined
      ? { show: true, parents: commit.parents }
      : { show: false, parents: [same] };
  };
}
