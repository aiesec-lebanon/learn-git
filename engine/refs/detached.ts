import { abbreviate } from "../objects/abbrev";
import { dwimRefs } from "../revisions/resolve";
import type { ObjectPool, Repo } from "../types";
import { resolveHead } from "./refs";

export type DetachedHead = {
  /** What HEAD was detached at: a ref name or a short commit ID. */
  readonly label: string;
  /** True while HEAD still sits there ("at"), false once it moved ("from"). */
  readonly at: boolean;
};

const SWITCH = /^checkout: moving from .* to (.*)$/;

/**
 * Where a detached HEAD came from, read from HEAD's reflog the way
 * `git status` reads it; null when HEAD is on a branch or no switch is logged.
 */
export function detachedHead(
  pool: ObjectPool,
  repo: Repo,
): DetachedHead | null {
  if (repo.head.kind !== "detached") return null;
  const log = repo.reflogs.get("HEAD") ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    const target = entry && SWITCH.exec(entry.message)?.[1];
    if (!entry?.new || target === undefined || target === null) continue;
    const refs = target === "HEAD" ? [] : dwimRefs(repo, target);
    const [ref] = refs;
    const label =
      refs.length === 1 && ref && repo.refs.get(ref) === entry.new
        ? ref.replace(/^refs\/(tags|remotes)\//, "")
        : abbreviate(pool, entry.new);
    return { label, at: resolveHead(repo) === entry.new };
  }
  return null;
}
