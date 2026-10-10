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

/** A file with its state as a glyph and a word, never colour alone. */
export function FileCard({
  file,
  area,
}: {
  file: Card;
  area: "worktree" | "index";
}) {
  const state = file.state ? STATES[file.state] : null;
  return (
    <li
      data-choreo={`file:${area}:${file.path}`}
      className="flex min-h-7 min-w-0 items-center gap-2"
    >
      <code className="min-w-0 truncate text-sm">
        <bdi>{file.path}</bdi>
      </code>
      {state ? (
        <span
          className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 text-xs font-semibold ${state.tone}`}
        >
          <span aria-hidden="true" className="font-mono">
            {state.glyph}
          </span>
          {state.text}
        </span>
      ) : null}
    </li>
  );
}
