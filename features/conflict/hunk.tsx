"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import { chosenText, type Choice, type Hunk } from "./model";

type PaneId = "ours" | "base" | "result" | "theirs";

const toggle =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

function Pane({
  title,
  shown,
  children,
}: {
  title: string;
  shown: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`${shown ? "grid" : "hidden"} min-w-0 content-start gap-1 sm:grid`}
    >
      <p className="m-0 text-xs font-semibold text-fg-muted">{title}</p>
      {children}
    </section>
  );
}

const Code = ({ text }: { text: string | null }) => (
  <pre className="m-0 min-h-11 overflow-x-auto rounded-sm border border-line bg-sunk p-2 font-mono text-xs whitespace-pre">
    {text === null ? "(not in the file)" : text || "(empty)"}
  </pre>
);

/** One conflict: ours, the result so far and theirs, with the ways to settle it. */
export function HunkView({
  hunk,
  sides,
  result,
  onApply,
}: {
  hunk: Hunk;
  /** Plain names for ours and theirs, read from the operation. */
  sides: { readonly ours: string; readonly theirs: string };
  /** The whole file with every undecided conflict marked. */
  result: ReactNode;
  onApply: (text: string) => void;
}) {
  const [pane, setPane] = useState<PaneId>("result");
  const [withBase, setWithBase] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const editId = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const isEditing = editing !== null;
  useEffect(() => {
    if (isEditing) box.current?.focus();
  }, [isEditing]);
  const panes: [PaneId, string][] = [
    ["ours", `Ours: ${hunk.labels.ours} (${sides.ours})`],
    ...(withBase
      ? [["base", "Base: before either change"] as [PaneId, string]]
      : []),
    ["result", "Result"],
    ["theirs", `Theirs: ${hunk.labels.theirs} (${sides.theirs})`],
  ];
  const take = (choice: Choice) => onApply(chosenText(hunk, choice));
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2 sm:hidden" aria-label="Show pane">
        {panes.map(([id, title]) => (
          <button
            key={id}
            type="button"
            aria-pressed={pane === id}
            onClick={() => setPane(id)}
            className={toggle}
          >
            {title.split(":")[0]}
          </button>
        ))}
      </div>
      <div
        className={`grid gap-2 ${withBase ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
      >
        {panes.map(([id, title]) => (
          <Pane key={id} title={title} shown={pane === id}>
            {id === "result" ? (
              result
            ) : (
              <Code
                text={
                  id === "ours"
                    ? hunk.ours
                    : id === "theirs"
                      ? hunk.theirs
                      : hunk.base
                }
              />
            )}
          </Pane>
        ))}
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={withBase}
          onChange={(event) => {
            setWithBase(event.target.checked);
            if (!event.target.checked && pane === "base") setPane("result");
          }}
          className="size-5 accent-accent-fill"
        />
        Show the base
        {withBase && hunk.base === null
          ? ": this file has none. git config merge.conflictStyle zdiff3 writes it next time."
          : null}
      </label>
      {editing === null ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => take("ours")}>Take ours</Button>
          <Button onClick={() => take("theirs")}>Take theirs</Button>
          <Button onClick={() => take("both")}>Take both</Button>
          <Button
            variant="quiet"
            onClick={() => setEditing(chosenText(hunk, "both"))}
          >
            Edit
          </Button>
        </div>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onApply(editing);
            setEditing(null);
          }}
        >
          <label htmlFor={editId} className="text-sm font-medium">
            The lines that replace this conflict
          </label>
          <textarea
            id={editId}
            ref={box}
            value={editing}
            onChange={(event) => setEditing(event.target.value)}
            rows={5}
            className="w-full rounded-sm border border-line bg-bg p-2 font-mono text-sm text-fg"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Use these lines
            </Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
