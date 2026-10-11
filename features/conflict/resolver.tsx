"use client";

import { useId, useMemo, useRef, useState } from "react";
import { shellQuote, type Session } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import { Button } from "@/ui/button";
import { HunkView } from "./hunk";
import {
  hunksOf,
  markerLines,
  parseConflicts,
  pausedMerge,
  replaceHunk,
  type ConflictFile,
  type Segment,
} from "./model";
import { RawView } from "./raw-view";
import { Ribbon } from "./ribbon";

const SIDES = { ours: "the branch you are on", theirs: "the branch merged in" };

const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 font-mono text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

function ResultText({
  segments,
  current,
}: {
  segments: readonly Segment[];
  current: number;
}) {
  const hunkNumber = segments.map(
    (_, i) => segments.slice(0, i).filter((s) => s.kind === "hunk").length,
  );
  return (
    <pre className="m-0 min-h-11 overflow-x-auto rounded-sm border border-line bg-sunk p-2 font-mono text-xs whitespace-pre">
      {segments.map((s, i) => {
        if (s.kind === "text") return s.text;
        const n = hunkNumber[i] ?? 0;
        return (
          <mark
            key={i}
            className="bg-st-conflict-bg text-st-conflict"
          >{`[conflict ${n + 1}${n === current ? ", above" : ""}: not decided]\n`}</mark>
        );
      })}
    </pre>
  );
}

function FileResolver({
  session,
  file,
}: {
  session: Session;
  file: ConflictFile;
}) {
  const [at, setAt] = useState(0);
  const [raw, setRaw] = useState(false);
  const headingId = useId();
  const top = useRef<HTMLDivElement>(null);
  const text = file.text;
  const segments = useMemo(() => parseConflicts(text ?? ""), [text]);
  const hunks = hunksOf(segments);
  const index = Math.min(at, Math.max(hunks.length - 1, 0));
  const hunk = hunks[index];
  const leftover = text === null ? [] : markerLines(text);
  const arg = shellQuote(file.arg);
  const apply = (replacement: string) => {
    session.run(`edit ${arg}`);
    session.resume(replaceHunk(segments, index, replacement));
    requestAnimationFrame(() => top.current?.focus());
  };

  if (text === null)
    return (
      <div className="grid justify-items-start gap-2 text-sm">
        <p className="m-0">
          <code>{file.path}</code> was deleted on one side and changed on the
          other. Remove it, or restore a version and mark it resolved.
        </p>
        <Button onClick={() => session.run(`git rm ${arg}`)}>
          Remove: <code>git rm {file.arg}</code>
        </Button>
      </div>
    );

  return (
    <div ref={top} tabIndex={-1} className="grid gap-3 outline-none">
      {hunk ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={headingId} className="m-0 mr-auto text-base font-semibold">
              Conflict {index + 1} of {hunks.length} in{" "}
              <code>
                <bdi>{file.path}</bdi>
              </code>
            </h3>
            <Button
              variant="quiet"
              disabled={index === 0}
              onClick={() => setAt(index - 1)}
            >
              Previous conflict
            </Button>
            <Button
              variant="quiet"
              disabled={index === hunks.length - 1}
              onClick={() => setAt(index + 1)}
            >
              Next conflict
            </Button>
          </div>
          <HunkView
            key={`${file.path}:${index}:${hunk.raw}`}
            hunk={hunk}
            sides={SIDES}
            result={<ResultText segments={segments} current={index} />}
            onApply={apply}
          />
        </>
      ) : (
        <p className="m-0 text-sm" role="status">
          {leftover.length
            ? `No complete conflict is left, but line ${leftover.join(", ")} still looks like a marker. Edit the file before marking it resolved.`
            : `All conflicts in ${file.path} are decided. Git still lists it as unmerged until you mark it resolved.`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={hunk || leftover.length ? "secondary" : "primary"}
          onClick={() => session.run(`git add ${arg}`)}
        >
          Mark resolved: <code>git add {file.arg}</code>
        </Button>
        <Button variant="quiet" aria-pressed={raw} onClick={() => setRaw(!raw)}>
          {raw ? "Hide raw markers" : "Show raw markers"}
        </Button>
      </div>
      {hunk && leftover.length ? (
        <p className="m-0 text-sm text-fg-muted">
          Marking it resolved now would record the conflict markers as they are.
        </p>
      ) : null}
      {raw ? <RawView text={text} /> : null}
    </div>
  );
}

/** Shown while a merge is paused: the ribbon and a per-hunk resolver (X-09). */
export function ConflictResolver({ session }: { session: Session }) {
  const { world } = useSession(session);
  const paused = useMemo(() => pausedMerge(world), [world]);
  const [chosen, setChosen] = useState<string | null>(null);
  const titleId = useId();
  if (!paused) return null;
  const file =
    paused.files.find((f) => f.path === chosen) ?? paused.files[0] ?? null;
  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1"
    >
      <h2 id={titleId} className="m-0 text-lg font-bold">
        Resolve the merge
      </h2>
      <Ribbon session={session} paused={paused} />
      {paused.files.length > 1 ? (
        <div className="flex flex-wrap gap-2" aria-label="Unmerged files">
          {paused.files.map((f) => (
            <button
              key={f.path}
              type="button"
              aria-pressed={f === file}
              onClick={() => setChosen(f.path)}
              className={chip}
            >
              <bdi>{f.path}</bdi>
            </button>
          ))}
        </div>
      ) : null}
      {file ? (
        <FileResolver key={file.path} session={session} file={file} />
      ) : null}
    </section>
  );
}
