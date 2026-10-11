"use client";

import { useId, useMemo, useState } from "react";
import type { Session } from "@/engine";
import { useAnnounce } from "@/features/announcer/announcer";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { useSession } from "@/features/stage/use-session";
import { DiffLines } from "./diff-lens";
import { discardable, discardPreview } from "./restore-picker.model";

/** Before discarding a file's edits in your Your turn sandbox, see exactly what git restore would throw away. */
export function DestructivePreview() {
  const session = useLessonSession();
  return session ? <DestructivePreviewFor session={session} /> : null;
}

function DestructivePreviewFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const say = useAnnounce();
  const files = useMemo(() => discardable(world), [world]);
  const [chosen, setChosen] = useState<string | null>(null);
  const id = useId();
  const path = chosen && files.includes(chosen) ? chosen : files[0];
  const preview = useMemo(
    () => (path ? discardPreview(world, path) : null),
    [world, path],
  );

  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="font-display font-bold">
        Preview a discard in your sandbox
      </figcaption>
      {path && preview ? (
        <>
          <label className="grid gap-1 text-sm font-semibold" htmlFor={id}>
            File with unstaged edits
            <select
              id={id}
              value={path}
              onChange={(e) => setChosen(e.target.value)}
              className="min-h-11 rounded-xs border border-line-strong bg-surface px-2 font-normal"
            >
              {files.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <p className="m-0 text-sm">
            <code className="font-mono">{preview.command}</code> would throw
            away these edits:
          </p>
          <DiffLines lines={preview.lines} />
          {preview.lost ? (
            <p className="m-0 rounded-xs bg-hl px-2 py-1 text-sm font-semibold">
              No commit or staged copy holds this version. In real Git it is
              gone for good; here Rewind can bring it back.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              session.run(preview.command);
              say(`Ran ${preview.command} in your sandbox.`);
            }}
            className="min-h-11 w-fit rounded-sm border border-line-strong bg-surface px-3 font-medium hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Discard with {preview.command}
          </button>
        </>
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          No unstaged edits to discard in your sandbox right now.
        </p>
      )}
    </figure>
  );
}
