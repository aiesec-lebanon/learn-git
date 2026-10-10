import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import type { ObjectPool, Oid } from "../types";
import { firstParentChain } from "./chain";

export type Rewritten = { readonly old: Oid; readonly new: Oid };

/**
 * The IDs the first-parent chain ending at `tip` would get if commit `at`
 * had `message` instead, oldest first. Nothing is written: history is untouched.
 */
export function rewriteMessage(
  pool: ObjectPool,
  tip: Oid,
  at: Oid,
  message: string,
): Rewritten[] {
  const renamed = new Map<Oid, Oid>();
  return firstParentChain(pool, tip).map((oid) => {
    const commit = readObject(pool, oid, "commit");
    const next = hashObject({
      ...commit,
      parents: commit.parents.map((p) => renamed.get(p) ?? p),
      message: oid === at ? message : commit.message,
    });
    renamed.set(oid, next);
    return { old: oid, new: next };
  });
}
