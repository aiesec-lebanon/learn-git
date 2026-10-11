import { commitOf } from "../commands/switch";
import { readObject } from "../objects/pool";
import { sameFile, type Files } from "../objects/tree";
import { resolveHead } from "../refs/refs";
import type { ObjectPool, Oid, Repo } from "../types";
import { compareBytes } from "../util/compare";
import { ancestorsOf, mergeBases } from "./base";
import { conflictCount, mergeFile, type MergeChunk } from "./file";
import { commitFiles } from "./three-way";

/** One file in a three-way merge: where its result comes from. */
export type FilePreview = {
  readonly path: string;
  readonly from: "ours" | "theirs" | "both" | "conflict";
  /** null when the file is absent on that side. */
  readonly base: string | null;
  readonly ours: string | null;
  readonly theirs: string | null;
  /** diff3-style chunks when both sides changed a text file. */
  readonly chunks: readonly MergeChunk[];
};

export type MergePreview =
  | { readonly kind: "unknown" | "unborn" | "unrelated" | "criss-cross" }
  | { readonly kind: "up-to-date"; readonly head: Oid }
  | { readonly kind: "fast-forward"; readonly from: Oid; readonly to: Oid }
  | {
      readonly kind: "merge";
      readonly head: Oid;
      readonly theirs: Oid;
      readonly base: Oid;
      readonly files: readonly FilePreview[];
      readonly conflicts: readonly string[];
    };

const text = (pool: ObjectPool, files: Files, path: string) => {
  const file = files.get(path as never);
  return file ? readObject(pool, file.oid, "blob").content : null;
};

/** What `git merge <name>` (or `--no-ff`) would do, without running it. */
export function previewMerge(
  pool: ObjectPool,
  repo: Repo,
  name: string,
  noFastForward = false,
): MergePreview {
  const theirs = commitOf(pool, repo, name);
  if (!theirs) return { kind: "unknown" };
  const head = resolveHead(repo);
  if (!head) return { kind: "unborn" };
  if (ancestorsOf(pool, head).has(theirs)) return { kind: "up-to-date", head };
  if (!noFastForward && ancestorsOf(pool, theirs).has(head)) {
    return { kind: "fast-forward", from: head, to: theirs };
  }
  const bases = mergeBases(pool, head, theirs);
  const [base] = bases;
  if (!base) return { kind: "unrelated" };
  if (bases.length > 1) return { kind: "criss-cross" };
  const trees = {
    base: commitFiles(pool, base),
    ours: commitFiles(pool, head),
    theirs: commitFiles(pool, theirs),
  };
  const paths = [
    ...new Set([
      ...trees.base.keys(),
      ...trees.ours.keys(),
      ...trees.theirs.keys(),
    ]),
  ].sort(compareBytes);
  const files: FilePreview[] = [];
  for (const path of paths) {
    const [b, o, t] = [trees.base, trees.ours, trees.theirs].map((f) =>
      f.get(path),
    );
    if (sameFile(b, o) && sameFile(b, t)) continue;
    const contents = {
      path,
      base: text(pool, trees.base, path),
      ours: text(pool, trees.ours, path),
      theirs: text(pool, trees.theirs, path),
    };
    if (sameFile(o, t) || sameFile(b, t) || sameFile(b, o)) {
      const from = sameFile(o, t) ? "both" : sameFile(b, o) ? "theirs" : "ours";
      files.push({ ...contents, from, chunks: [] });
      continue;
    }
    const merged =
      contents.ours !== null && contents.theirs !== null
        ? mergeFile(
            contents.base ?? "",
            contents.ours,
            contents.theirs,
            "diff3",
          )
        : null;
    const clean = merged?.kind === "text" && conflictCount(merged.chunks) === 0;
    files.push({
      ...contents,
      from: clean ? "both" : "conflict",
      chunks: merged?.kind === "text" ? merged.chunks : [],
    });
  }
  return {
    kind: "merge",
    head,
    theirs,
    base,
    files,
    conflicts: files.filter((f) => f.from === "conflict").map((f) => f.path),
  };
}
