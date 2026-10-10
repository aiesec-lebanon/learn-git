import type { FileCard as Card, FileState } from "./files";

const STATES: Record<FileState, { glyph: string; text: string; tone: string }> =
  {
    unmodified: { glyph: "·", text: "unchanged", tone: "text-fg-muted" },
    untracked: {
      glyph: "?",
      text: "untracked",
      tone: "bg-st-untracked-bg text-st-untracked",
    },
    modified: {
      glyph: "M",
      text: "modified",
      tone: "bg-st-modified-bg text-st-modified",
    },
    added: { glyph: "A", text: "new", tone: "bg-st-added-bg text-st-added" },
    deleted: {
      glyph: "D",
      text: "deleted",
      tone: "bg-st-deleted-bg text-st-deleted",
    },
    conflict: {
      glyph: "!",
      text: "conflict",
      tone: "bg-st-conflict-bg text-st-conflict",
    },
  };

/** A file's state as a glyph and a word, never colour alone. */
export function FileStateChip({ state }: { state: FileState }) {
  const { glyph, text, tone } = STATES[state];
  return (
    <span
      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 text-xs font-semibold ${tone}`}
    >
      <span aria-hidden="true" className="font-mono">
        {glyph}
      </span>
      {text}
    </span>
  );
}

/** A file with its state. */
export function FileCard({
  file,
  area,
}: {
  file: Card;
  area: "worktree" | "index";
}) {
  return (
    <li
      data-choreo={`file:${area}:${file.path}`}
      className="flex min-h-7 min-w-0 items-center gap-2"
    >
      <code className="min-w-0 truncate text-sm">
        <bdi>{file.path}</bdi>
      </code>
      {file.state ? <FileStateChip state={file.state} /> : null}
      {file.split ? (
        <span className="shrink-0 rounded-xs bg-hl px-1.5 text-xs font-semibold text-fg">
          {area === "index" ? "older than your file" : "newer than staged"}
        </span>
      ) : null}
    </li>
  );
}
