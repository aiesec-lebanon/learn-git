import { changedPairs, commitSnapshot } from "../diff/forms";
import { diffContents } from "../diff/numstat";
import { diffHunks, type FilePair } from "../diff/unified";
import type { ObjectPool, Oid } from "../types";

export type DiffLineView = {
  readonly sign: " " | "-" | "+";
  /** The line without its line break. */
  readonly text: string;
  /** Line numbers in the old and new version (null on the side that lacks the line). */
  readonly old: number | null;
  readonly new: number | null;
};

export type HunkView = {
  readonly header: string;
  readonly lines: readonly DiffLineView[];
};

export type FileDiffView = {
  readonly path: string;
  /** The old path of a renamed file. */
  readonly from?: string;
  readonly change: "added" | "modified" | "deleted" | "renamed";
  readonly binary: boolean;
  readonly tooLarge: boolean;
  readonly added: number;
  readonly deleted: number;
  readonly hunks: readonly HunkView[];
};

const HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

function numbered(
  header: string,
  lines: readonly { sign: " " | "-" | "+"; text: string }[],
): HunkView {
  const [, a = "1", b = "1"] = HEADER.exec(header) ?? [];
  let old = Number(a);
  let now = Number(b);
  return {
    header,
    lines: lines.map(({ sign, text }) => ({
      sign,
      text: text.replace(/\n$/, ""),
      old: sign === "+" ? null : old++,
      new: sign === "-" ? null : now++,
    })),
  };
}

function fileDiff(pair: FilePair): FileDiffView {
  const diff = diffContents(
    pair.before?.content ?? null,
    pair.after?.content ?? null,
  );
  const hunks =
    diff.kind === "text"
      ? diffHunks(diff.a, diff.b, diff.keptA, diff.keptB).map((h) =>
          numbered(h.header, h.lines),
        )
      : [];
  const count = (sign: "+" | "-") =>
    hunks.reduce(
      (n, h) => n + h.lines.filter((l) => l.sign === sign).length,
      0,
    );
  return {
    path: pair.path,
    ...(pair.from ? { from: pair.from } : {}),
    change: pair.from
      ? "renamed"
      : !pair.before
        ? "added"
        : !pair.after
          ? "deleted"
          : "modified",
    binary: diff.kind === "binary",
    tooLarge: diff.kind === "too-large",
    added: count("+"),
    deleted: count("-"),
    hunks,
  };
}

/** What changed from one commit's snapshot to another's (null = the empty tree), file by file. */
export function diffCommits(
  pool: ObjectPool,
  before: Oid | null,
  after: Oid,
): FileDiffView[] {
  return changedPairs(
    commitSnapshot(pool, before),
    commitSnapshot(pool, after),
  ).map(fileDiff);
}
