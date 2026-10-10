import { numstat } from "../diff/numstat";
import { quotePath } from "../files/quote";
import { readObject } from "../objects/pool";
import type { TreeFile } from "../objects/tree";
import type { ObjectPool, RepoPath } from "../types";
import { compareBytes } from "../util/compare";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The diffstat summary Git prints after a commit: the totals line plus
 * `create mode` and `delete mode` lines in path order.
 */
export function commitSummary(
  pool: ObjectPool,
  before: ReadonlyMap<RepoPath, TreeFile>,
  after: ReadonlyMap<RepoPath, TreeFile>,
): string {
  const content = (file: TreeFile | undefined) =>
    file ? readObject(pool, file.oid, "blob").content : null;
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort(
    compareBytes,
  );
  let files = 0;
  let added = 0;
  let deleted = 0;
  const modes: string[] = [];
  for (const path of paths) {
    const a = before.get(path);
    const b = after.get(path);
    if (a?.oid === b?.oid && a?.mode === b?.mode) continue;
    files++;
    const stat = numstat(content(a), content(b));
    added += stat.added;
    deleted += stat.deleted;
    if (!a && b) modes.push(` create mode ${b.mode} ${quotePath(path)}\n`);
    if (a && !b) modes.push(` delete mode ${a.mode} ${quotePath(path)}\n`);
  }
  const parts = [` ${plural(files, "file changed", "files changed")}`];
  if (added || !deleted)
    parts.push(plural(added, "insertion(+)", "insertions(+)"));
  if (deleted || !added)
    parts.push(plural(deleted, "deletion(-)", "deletions(-)"));
  return `${parts.join(", ")}\n${modes.join("")}`;
}
