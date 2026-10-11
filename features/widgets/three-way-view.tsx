"use client";

import { useState } from "react";
import type { FilePreview, Session } from "@/engine";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-session";
import {
  BranchChips,
  mergeCandidates,
  namesFor,
  previewIn,
} from "./merge-preview";
import { outcomeText } from "./merge-preview.model";
import { fileNote, mergedText } from "./three-way-view.model";

/** Base, ours and theirs side by side, flowing into the result (B4.2). */
export function ThreeWayView() {
  const session = useLessonSession();
  return session ? <ThreeWayFor session={session} /> : null;
}

function Pane({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <p className="m-0 text-xs font-semibold text-fg-muted">{title}</p>
      <pre className="m-0 min-h-11 rounded-sm border border-line bg-sunk p-2 font-mono text-xs wrap-anywhere whitespace-pre-wrap">
        {text ?? "(no file)"}
      </pre>
    </div>
  );
}

function FileRow({
  file,
  branch,
  name,
}: {
  file: FilePreview;
  branch: string;
  name: string;
}) {
  return (
    <li className="grid gap-2 border-t border-line pt-3">
      <p className="m-0 text-sm">
        <code>
          <bdi>{file.path}</bdi>
        </code>
        : {fileNote(file)}
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <Pane title="Merge base" text={file.base} />
        <Pane title={`Ours (${branch})`} text={file.ours} />
        <Pane title={`Theirs (${name})`} text={file.theirs} />
        <Pane
          title="Result"
          text={
            file.from === "conflict"
              ? "Conflict: you decide."
              : mergedText(file)
          }
        />
      </div>
    </li>
  );
}

function ThreeWayFor({ session }: { session: Session }) {
  const { world, view } = useSandboxView(session);
  const [chosen, setChosen] = useState<string | null>(null);
  if (!view) return null;
  const { branch, others } = mergeCandidates(view);
  const picked = chosen && others.includes(chosen) ? chosen : null;
  const preview = picked ? previewIn(world, view, picked) : null;
  const names = branch && picked ? namesFor(view, branch, picked) : null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Pick a branch to merge into {branch ?? "HEAD"}: see the three snapshots
        Git compares and where each file of the result comes from. Nothing runs.
      </figcaption>
      {branch && others.length ? (
        <BranchChips names={others} picked={picked} onPick={setChosen} />
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          Switch to a branch with another branch beside it to compare.
        </p>
      )}
      {preview && names ? (
        preview.kind === "merge" ? (
          <>
            <p className="m-0 text-sm">
              Merge base {names.short(preview.base)}, ours{" "}
              {names.short(preview.head)} ({names.branch}), theirs{" "}
              {names.short(preview.theirs)} ({names.name}).{" "}
              {preview.files.length
                ? `${preview.files.length} file${preview.files.length === 1 ? "" : "s"} changed since the base.`
                : "No file changed since the base."}
            </p>
            <ul className="m-0 grid list-none gap-3 p-0">
              {preview.files.map((file) => (
                <FileRow
                  key={file.path}
                  file={file}
                  branch={names.branch}
                  name={names.name}
                />
              ))}
            </ul>
          </>
        ) : (
          <p className="m-0 text-sm">
            {outcomeText(preview, names)} No three snapshots to combine.
          </p>
        )
      ) : null}
    </figure>
  );
}
