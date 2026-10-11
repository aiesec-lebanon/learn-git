import { numstat } from "../diff/numstat";
import { detectRenames, renameName } from "../diff/renames";
import { statTotals } from "../diff/stat";
import { quotePath } from "../files/quote";
import { readObject } from "../objects/pool";
import type { TreeFile } from "../objects/tree";
import type { FilePair } from "../diff/unified";
import type { ObjectPool, RepoPath } from "../types";
import { compareBytes } from "../util/compare";

/**
 * The diffstat summary Git prints after a commit: the totals line plus
 * `create mode`, `delete mode` and `rename` lines in path order.
 */
export function commitSummary(
  pool: ObjectPool,
  before: ReadonlyMap<RepoPath, TreeFile>,
  after: ReadonlyMap<RepoPath, TreeFile>,
): string {
  const file = (t: TreeFile | undefined) =>
    t ? { ...t, content: readObject(pool, t.oid, "blob").content } : null;
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort(
    compareBytes,
  );
  const pairs = detectRenames(
    paths
      .filter((path) => {
        const a = before.get(path);
        const b = after.get(path);
        return a?.oid !== b?.oid || a?.mode !== b?.mode;
      })
      .map((path) => ({
        path,
        before: file(before.get(path)),
        after: file(after.get(path)),
      })),
  );
  let added = 0;
  let deleted = 0;
  for (const { before: a, after: b } of pairs) {
    const stat = numstat(a?.content ?? null, b?.content ?? null);
    added += stat.added;
    deleted += stat.deleted;
  }
  return statTotals(pairs.length, added, deleted) + summaryLines(pairs);
}

/** `--summary`: `create mode`, `delete mode` and `rename` lines in path order. */
export function summaryLines(pairs: readonly FilePair[]): string {
  return pairs
    .map(({ path, before: a, after: b, from, similarity }) => {
      if (from !== undefined)
        return ` rename ${renameName(quotePath(from), quotePath(path))} (${similarity}%)\n`;
      if (!a && b) return ` create mode ${b.mode} ${quotePath(path)}\n`;
      if (a && !b) return ` delete mode ${a.mode} ${quotePath(path)}\n`;
      return "";
    })
    .join("");
}
