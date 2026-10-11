import { mergeBases } from "../merge/base";
import { commitFiles } from "../merge/three-way";
import { mergeTrees } from "../merge/tree";
import type { TreeFile } from "../objects/tree";
import type { Blob, ObjectPool, Oid, RepoPath } from "../types";

export type DryMerge =
  | {
      readonly ok: true;
      readonly files: ReadonlyMap<RepoPath, TreeFile>;
      /** Merged contents the result needs. */
      readonly blobs: readonly Blob[];
    }
  | { readonly ok: false; readonly conflicts: readonly string[] };

/** Merges `head` into `base` in memory (a dry run): the result's files, or the conflicting paths. */
export function dryMerge(pool: ObjectPool, base: Oid, head: Oid): DryMerge {
  const [ancestor = null] = mergeBases(pool, base, head);
  const ours = commitFiles(pool, base);
  const merged = mergeTrees(
    pool,
    {
      base: commitFiles(pool, ancestor),
      ours,
      theirs: commitFiles(pool, head),
    },
    { ours: "base", theirs: "head", base: "merge base" },
    "merge",
  );
  if (!merged.ok) return { ok: false, conflicts: [merged.tooLarge] };
  if (merged.conflicts.length)
    return { ok: false, conflicts: merged.conflicts };
  const files = new Map(ours);
  for (const [path, outcome] of merged.outcomes) {
    if (outcome.kind === "clean" && outcome.file) files.set(path, outcome.file);
    else files.delete(path);
  }
  return { ok: true, files, blobs: merged.blobs };
}
