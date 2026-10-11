import type { Effect, Oid, RefName, Repo, Signature } from "../types";
import { withEntry, withoutEntry } from "../util/cow";
import { appendReflog } from "./reflog";

/** The branch HEAD points at, or null when detached. */
export function headBranch(repo: Repo): RefName | null {
  return repo.head.kind === "symbolic" ? repo.head.ref : null;
}

/** Every ref with the commit it names, symbolic ones resolved (dangling ones left out). */
export function allRefs(repo: Repo): ReadonlyMap<RefName, Oid> {
  if (!repo.symrefs?.size) return repo.refs;
  const out = new Map(repo.refs);
  for (const [ref, target] of repo.symrefs) {
    const oid = repo.refs.get(target);
    if (oid) out.set(ref, oid);
  }
  return out;
}

/** The commit HEAD resolves to, or null on an unborn branch. */
export function resolveHead(repo: Repo): Oid | null {
  return repo.head.kind === "detached"
    ? repo.head.oid
    : (repo.refs.get(repo.head.ref) ?? null);
}

/**
 * Moves a ref (null deletes it) and records the reflog: on the ref itself
 * and, when HEAD points at that ref, on HEAD too (as Git does).
 */
export function updateRef(
  repo: Repo,
  ref: RefName,
  to: Oid | null,
  who: Signature,
  message: string,
): { repo: Repo; effect: Effect } {
  const from = repo.refs.get(ref) ?? null;
  const refs =
    to === null ? withoutEntry(repo.refs, ref) : withEntry(repo.refs, ref, to);
  let next: Repo = { ...repo, refs };
  if (to === null) {
    next = { ...next, reflogs: withoutEntry(next.reflogs, ref) };
  } else {
    const entry = { old: from, new: to, who, message };
    next = appendReflog(next, ref, entry);
    if (headBranch(repo) === ref) next = appendReflog(next, "HEAD", entry);
  }
  return {
    repo: next,
    effect: { kind: "ref-updated", repo: repo.id, ref, from, to },
  };
}
