import type { ObjectPool, Oid, RefName, Repo } from "../types";
import { resolveHead } from "../refs/refs";
import { parseRevision } from "./parse";

export type Resolved =
  | { readonly ok: true; readonly oid: Oid }
  | { readonly ok: false; readonly reason: "unknown" | "ambiguous-id" };

const DWIM = [
  (n: string) => n,
  (n: string) => `refs/${n}`,
  (n: string) => `refs/tags/${n}`,
  (n: string) => `refs/heads/${n}`,
  (n: string) => `refs/remotes/${n}`,
  (n: string) => `refs/remotes/${n}/HEAD`,
];

/** Every ref a short name matches by Git's search order. */
export function dwimRefs(repo: Repo, name: string): RefName[] {
  return DWIM.map((rule) => rule(name) as RefName).filter((ref) =>
    repo.refs.has(ref),
  );
}

const FULL_ID = /^[0-9a-f]{40}$/;
const SHORT_ID = /^[0-9a-f]{4,39}$/;

function resolveBase(pool: ObjectPool, repo: Repo, name: string): Resolved {
  if (FULL_ID.test(name)) return { ok: true, oid: name as Oid };
  if (name === "HEAD") {
    const head = resolveHead(repo);
    return head ? { ok: true, oid: head } : { ok: false, reason: "unknown" };
  }
  for (const rule of DWIM) {
    const oid = repo.refs.get(rule(name) as RefName);
    if (oid) return { ok: true, oid };
  }
  if (!SHORT_ID.test(name)) return { ok: false, reason: "unknown" };
  const matches = [...pool.keys()].filter((oid) => oid.startsWith(name));
  if (matches.length > 1) return { ok: false, reason: "ambiguous-id" };
  const [only] = matches;
  return only ? { ok: true, oid: only } : { ok: false, reason: "unknown" };
}

const parentsOf = (pool: ObjectPool, oid: Oid) => {
  const object = pool.get(oid);
  return object?.type === "commit" ? object.parents : null;
};

/**
 * Git's revision lookup for the Beginner subset: a full or unique short
 * ID, `HEAD`/`@`, a ref by Git's search order, then `~n`, `^` and `^n`.
 */
export function resolveRevision(
  pool: ObjectPool,
  repo: Repo,
  text: string,
): Resolved {
  const parsed = parseRevision(text);
  if (!parsed) return { ok: false, reason: "unknown" };
  const base = resolveBase(pool, repo, parsed.base);
  if (!base.ok) return base;
  let oid = base.oid;
  for (const step of parsed.steps) {
    const count = step.kind === "ancestor" ? step.n : Math.min(step.n, 1);
    const index = step.kind === "ancestor" ? 0 : step.n - 1;
    for (let i = 0; i < count; i++) {
      const next = parentsOf(pool, oid)?.[index];
      if (!next) return { ok: false, reason: "unknown" };
      oid = next;
    }
    if (step.kind === "parent" && step.n === 0 && !parentsOf(pool, oid)) {
      return { ok: false, reason: "unknown" };
    }
  }
  return { ok: true, oid };
}
