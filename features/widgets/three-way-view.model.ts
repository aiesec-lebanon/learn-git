import type { FilePreview, MergeChunk } from "@/engine";
import type { CommitView, RepoView } from "@/features/graph/view-model";

const NOTES: Record<FilePreview["from"], string> = {
  ours: "Changed only on ours: the result keeps ours.",
  theirs: "Changed only on theirs: the result takes theirs.",
  both: "Both sides changed it, in different places: Git combines them.",
  conflict: "Both sides changed the same lines: Git stops and asks you.",
};

const chunkLines = (chunk: MergeChunk): readonly string[] =>
  chunk.kind === "conflict" ? [] : chunk.lines;

/** The file's merged text, null when it is deleted or still conflicted. */
export function mergedText(file: FilePreview): string | null {
  switch (file.from) {
    case "ours":
      return file.ours;
    case "theirs":
      return file.theirs;
    case "conflict":
      return null;
    case "both":
      return file.chunks.length
        ? file.chunks.flatMap(chunkLines).join("")
        : file.ours;
  }
}

/** One plain sentence per file: where its result comes from. */
export function fileNote(file: FilePreview): string {
  if (file.from === "both" && file.ours === file.theirs) {
    return "Both sides made the same change: the result has it once.";
  }
  return NOTES[file.from];
}

/** A commit's parents in order, with what each one means in a merge. */
export function parentLines(view: RepoView, commit: CommitView): string[] {
  const parents = commit.parents.map(
    (oid) => view.commits.find((c) => c.oid === oid) ?? null,
  );
  const name = (c: CommitView | null) =>
    c ? `${c.short} "${c.subject}"` : "a commit not shown";
  if (parents.length === 0) {
    return [`${commit.short} is the first commit: it has no parent.`];
  }
  if (parents.length === 1) {
    return [
      `${commit.short} has one parent, ${name(parents[0] ?? null)}. Only a merge commit has two.`,
    ];
  }
  return [
    `${commit.short} is a merge commit with ${parents.length} parents.`,
    ...parents.map((p, i) =>
      i === 0
        ? `First parent (${commit.short}^1): ${name(p)}, where the branch was before the merge.`
        : `Parent ${i + 1} (${commit.short}^${i + 1}): ${name(p)}, the tip that was merged in.`,
    ),
  ];
}
