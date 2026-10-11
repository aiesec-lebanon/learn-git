import { summaryLines } from "../commit/summary";
import { changedPairs, commitSnapshot } from "../diff/forms";
import { diffStat } from "../diff/stat";
import { shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { headBranch, updateRef } from "../refs/refs";
import { dwimRefs } from "../revisions/resolve";
import type { Effect, ObjectPool, Oid, Repo, Signature } from "../types";

/** Git's default merge message (`fmt-merge-msg`) for one merged name. */
export function defaultMergeMessage(repo: Repo, typed: string): string {
  const [ref] = dwimRefs(repo, typed);
  const what = ref?.startsWith("refs/heads/")
    ? `branch '${shortRefName(ref)}'`
    : ref?.startsWith("refs/remotes/")
      ? `remote-tracking branch '${shortRefName(ref)}'`
      : `commit '${typed}'`;
  const branch = headBranch(repo);
  const current = branch ? shortRefName(branch) : "HEAD";
  const into = ["main", "master"].includes(current) ? "" : ` into ${current}`;
  return `Merge ${what}${into}\n`;
}

/** The message of a merge `git pull` makes: `Merge branch 'main' of <url>`. */
export function pullMergeMessage(
  repo: Repo,
  branch: string,
  url: string,
): string {
  const current = headBranch(repo);
  const name = current ? shortRefName(current) : "HEAD";
  const into = ["main", "master"].includes(name) ? "" : ` into ${name}`;
  return `Merge branch '${branch}' of ${url}${into}\n`;
}

/** `MERGE_MSG` while conflicts wait: the message plus the conflicted paths. */
export const conflictMessage = (message: string, paths: readonly string[]) =>
  `${message}\n# Conflicts:\n${paths.map((p) => `#\t${p}\n`).join("")}`;

/** The diffstat and summary Git prints after a merge moves HEAD. */
export function mergeStat(pool: ObjectPool, from: Oid, to: Oid): string {
  const pairs = changedPairs(
    commitSnapshot(pool, from),
    commitSnapshot(pool, to),
  );
  return diffStat(pairs) + summaryLines(pairs);
}

/** Moves the current branch (or a detached HEAD) to `to` with a reflog entry. */
export function advanceHead(
  repo: Repo,
  to: Oid,
  who: Signature,
  message: string,
): { repo: Repo; effect: Effect } {
  if (repo.head.kind === "symbolic") {
    return updateRef(repo, repo.head.ref, to, who, message);
  }
  const from = repo.head;
  const next = appendReflog(
    { ...repo, head: { kind: "detached", oid: to } },
    "HEAD",
    { old: from.oid, new: to, who, message },
  );
  return {
    repo: next,
    effect: { kind: "head-changed", repo: repo.id, from, to: next.head },
  };
}
