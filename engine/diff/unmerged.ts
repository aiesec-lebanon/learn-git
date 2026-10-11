import { quotePath } from "../files/quote";
import { worktreeFiles } from "../files/worktree";
import { readObject } from "../objects/pool";
import type { Fs, ObjectPool, Repo, RepoPath } from "../types";
import { combinedDiff } from "./combined";

export const unmergedLine = (path: string) =>
  `* Unmerged path ${quotePath(path)}\n`;

/**
 * `git diff` for a conflicted path: a combined diff of the working file
 * against ours (stage 2) and theirs (stage 3), else Git's one-line notice.
 */
export function unmergedDiff(
  pool: ObjectPool,
  repo: Repo,
  fs: Fs,
  path: RepoPath,
): string {
  const entries = repo.index.get(path) ?? [];
  const ours = entries.find((e) => e.stage === 2);
  const theirs = entries.find((e) => e.stage === 3);
  const content = worktreeFiles(fs, repo.workdir).get(path);
  if (!ours || !theirs || content === undefined) return unmergedLine(path);
  const side = (oid: typeof ours.oid) => ({
    oid,
    content: readObject(pool, oid, "blob").content,
  });
  return combinedDiff(pool, path, [side(ours.oid), side(theirs.oid)], {
    oid: null,
    content,
  });
}
