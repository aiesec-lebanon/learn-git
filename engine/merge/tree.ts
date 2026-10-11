import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { sameFile as same, type Files, type TreeFile } from "../objects/tree";
import type { Blob, ObjectPool, RepoPath, Stage } from "../types";
import { compareBytes } from "../util/compare";
import {
  conflictCount,
  mergeFile,
  renderMerge,
  type ConflictStyle,
  type MergeLabels,
} from "./file";

export type { Files } from "../objects/tree";

/** One path's outcome: a resolved file (null = absent) or conflict stages. */
export type PathOutcome =
  | { readonly kind: "clean"; readonly file: TreeFile | null }
  | {
      readonly kind: "conflict";
      readonly stages: ReadonlyMap<Stage, TreeFile>;
      /** What the working tree holds: markers, or the surviving version. */
      readonly worktree: TreeFile;
    };

export type TreeMerge =
  | {
      readonly ok: true;
      /** Only the paths whose result differs from ours. */
      readonly outcomes: ReadonlyMap<RepoPath, PathOutcome>;
      /** Ort's per-path lines (`Auto-merging`, `CONFLICT`) in path order. */
      readonly lines: readonly string[];
      readonly conflicts: readonly RepoPath[];
      /** Blobs the merge created (merged contents and marker files). */
      readonly blobs: readonly Blob[];
    }
  | { readonly ok: false; readonly tooLarge: RepoPath };

const content = (pool: ObjectPool, file: TreeFile | undefined) =>
  file ? readObject(pool, file.oid, "blob").content : "";

/**
 * Ort's tree merge without rename detection: per path, a side that did
 * not change takes the other; both changing merges the contents, or
 * leaves stages 1 to 3 and a marked-up file; add/add and modify/delete
 * conflict as Git reports them.
 */
export function mergeTrees(
  pool: ObjectPool,
  trees: { readonly base: Files; readonly ours: Files; readonly theirs: Files },
  labels: MergeLabels,
  style: ConflictStyle,
): TreeMerge {
  const { base, ours, theirs } = trees;
  const paths = [
    ...new Set([...base.keys(), ...ours.keys(), ...theirs.keys()]),
  ].sort(compareBytes);
  const outcomes = new Map<RepoPath, PathOutcome>();
  const lines: string[] = [];
  const conflicts: RepoPath[] = [];
  const blobs: Blob[] = [];
  const blobFile = (text: string, mode: TreeFile["mode"]): TreeFile => {
    const blob: Blob = { type: "blob", content: text };
    blobs.push(blob);
    return { oid: hashObject(blob), mode };
  };
  for (const path of paths) {
    const b = base.get(path);
    const o = ours.get(path);
    const t = theirs.get(path);
    if (same(o, t) || same(b, t)) continue;
    if (same(b, o)) {
      outcomes.set(path, { kind: "clean", file: t ?? null });
      continue;
    }
    if (o && t) {
      lines.push(`Auto-merging ${path}\n`);
      const merged = mergeFile(
        content(pool, b),
        content(pool, o),
        content(pool, t),
        style,
      );
      if (merged.kind === "too-large") return { ok: false, tooLarge: path };
      const mode = b && o.mode === b.mode ? t.mode : o.mode;
      const text =
        merged.kind === "text"
          ? renderMerge(merged.chunks, style, labels)
          : null;
      if (merged.kind === "text" && conflictCount(merged.chunks) === 0) {
        outcomes.set(path, { kind: "clean", file: blobFile(text ?? "", mode) });
        continue;
      }
      lines.push(
        `CONFLICT (${b ? "content" : "add/add"}): Merge conflict in ${path}\n`,
      );
      const stages = new Map<Stage, TreeFile>([
        ...(b ? [[1, b] as const] : []),
        [2, o],
        [3, t],
      ]);
      const worktree = text === null ? o : blobFile(text, mode);
      outcomes.set(path, { kind: "conflict", stages, worktree });
      conflicts.push(path);
      continue;
    }
    const kept = (o ?? t) as TreeFile;
    const [deleted, modified] = o
      ? [labels.theirs, labels.ours]
      : [labels.ours, labels.theirs];
    lines.push(
      `CONFLICT (modify/delete): ${path} deleted in ${deleted} and modified in ${modified}.  Version ${modified} of ${path} left in tree.\n`,
    );
    const stages = new Map<Stage, TreeFile>([
      [1, b as TreeFile],
      [o ? 2 : 3, kept],
    ]);
    outcomes.set(path, { kind: "conflict", stages, worktree: kept });
    conflicts.push(path);
  }
  return { ok: true, outcomes, lines, conflicts, blobs };
}
