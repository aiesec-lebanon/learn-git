import { subjectOf } from "../commit/message";
import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import type { ObjectPool, Oid } from "../types";

/** The first-parent chain that ends at `tip`, oldest first. */
export function firstParentChain(pool: ObjectPool, tip: Oid): Oid[] {
  const chain: Oid[] = [];
  for (let at: Oid | undefined = tip; at;) {
    chain.push(at);
    at = readObject(pool, at, "commit").parents[0];
  }
  return chain.reverse();
}

export type SnapshotFile = {
  readonly path: string;
  readonly content: string;
  /** Against the parent's snapshot. */
  readonly change: "added" | "modified" | null;
};

export type CommitSnapshot = {
  readonly oid: Oid;
  readonly subject: string;
  readonly files: readonly SnapshotFile[];
  /** Paths the parent had and this commit does not. */
  readonly deleted: readonly string[];
};

/** Every file of one commit's snapshot, marked against its first parent. */
export function commitSnapshot(pool: ObjectPool, oid: Oid): CommitSnapshot {
  const commit = readObject(pool, oid, "commit");
  const files = flattenTree(pool, commit.tree);
  const parent = commit.parents[0];
  const before = parent
    ? flattenTree(pool, readObject(pool, parent, "commit").tree)
    : new Map();
  return {
    oid,
    subject: subjectOf(commit.message),
    files: [...files].map(([path, file]) => ({
      path,
      content: readObject(pool, file.oid, "blob").content,
      change: !before.has(path)
        ? "added"
        : before.get(path)?.oid !== file.oid
          ? "modified"
          : null,
    })),
    deleted: [...before.keys()].filter((path) => !files.has(path)),
  };
}
