import { checkoutPaths } from "../checkout/two-way";
import type { CommandResult } from "../commands/registry";
import { reflogWho } from "../config/identity";
import { appendReflog } from "../refs/reflog";
import { resolveHead } from "../refs/refs";
import { conflictedPaths, stagedFiles } from "../staging/index";
import { sameFile } from "../objects/tree";
import type { Machine, Oid, Repo, World } from "../types";
import { compareBytes } from "../util/compare";
import { withMachine, withRepo } from "../world/access";
import { commitFiles } from "./three-way";

/** The repository with no operation in progress (`MERGE_HEAD` gone). */
export function withoutOperation(repo: Repo): Repo {
  if (!repo.op) return repo;
  const next: { -readonly [K in keyof Repo]: Repo[K] } = { ...repo };
  delete next.op;
  return next;
}

/**
 * `git merge --abort` (`git reset --merge`): every path the merge staged
 * or left conflicted returns to HEAD in the index and working tree; other
 * local changes stay.
 */
export function abortMerge(
  world: World,
  repo: Repo,
  machine: Machine,
  time: number,
): CommandResult {
  const pool = world.objects;
  const head = resolveHead(repo) as Oid;
  const headFiles = commitFiles(pool, head);
  const staged = stagedFiles(repo.index);
  const conflicted = new Set<string>(conflictedPaths(repo.index));
  const paths = [...new Set([...headFiles.keys(), ...repo.index.keys()])]
    .filter(
      (path) =>
        conflicted.has(path) ||
        !sameFile(headFiles.get(path), staged.get(path)),
    )
    .sort(compareBytes);
  const reset = checkoutPaths(pool, repo, machine, headFiles, paths);
  const who = reflogWho(world, machine, repo, time);
  const next = appendReflog(
    withoutOperation({ ...reset.repo, origHead: head }),
    "HEAD",
    { old: head, new: head, who, message: "reset: moving to HEAD" },
  );
  return {
    world: withMachine(withRepo(world, next), { ...machine, fs: reset.fs }),
    effects: [
      ...reset.effects,
      {
        kind: "operation",
        repo: repo.id,
        operation: "merge",
        phase: "aborted",
      },
    ],
  };
}
