"use client";

import { useId, useMemo, useState } from "react";
import type { Session } from "@/engine";
import { useLessonSession } from "@/features/lesson/lesson-session";
import { useSession } from "@/features/stage/use-session";
import {
  diffLines,
  lensCommand,
  lensOutput,
  lensSnapshots,
  type AnatomyPart,
  type DiffLine,
} from "./diff-lens.model";

const LINE_STYLE: Readonly<Record<AnatomyPart, string>> = {
  header: "font-semibold",
  hunk: "text-accent-ink",
  removed: "bg-st-deleted-bg text-st-deleted",
  added: "bg-st-added-bg text-st-added",
  context: "",
};

/** Diff text with removed and added lines tinted; `lit` outlines one part. */
export function DiffLines({
  lines,
  lit,
  onPoint,
}: {
  lines: readonly DiffLine[];
  lit?: AnatomyPart;
  onPoint?: (part: AnatomyPart) => void;
}) {
  return (
    <pre className="m-0 max-h-80 overflow-auto rounded-sm border border-line bg-sunk p-2 font-mono text-sm">
      {lines.map((line, i) => (
        <span
          key={i}
          onPointerEnter={onPoint && (() => onPoint(line.part))}
          className={`block px-1 whitespace-pre ${LINE_STYLE[line.part]} ${lit === line.part ? "outline-2 outline-accent" : ""}`}
        >
          <bdi>{line.text || " "}</bdi>
        </span>
      ))}
    </pre>
  );
}

/** Pick any two snapshots of your Your turn sandbox; the lens prints the git diff that compares them. */
export function DiffLens() {
  const session = useLessonSession();
  return session ? <DiffLensFor session={session} /> : null;
}

function DiffLensFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const snapshots = useMemo(() => lensSnapshots(world), [world]);
  const [picked, setPicked] = useState<{ a?: string; b: string }>({
    b: "worktree",
  });
  const ids = useId();
  const has = (id?: string) => !!id && !!snapshots?.some((s) => s.id === id);
  const a = has(picked.a)
    ? (picked.a as string)
    : has("HEAD")
      ? "HEAD"
      : "index";
  const b = has(picked.b) ? picked.b : "worktree";
  const command = snapshots ? lensCommand(snapshots, a, b) : null;
  const lines = useMemo(
    () => (command ? diffLines(lensOutput(world, command)) : []),
    [world, command],
  );
  if (!snapshots) return null;
  const select = (key: "a" | "b", label: string, value: string) => (
    <label
      className="grid gap-1 text-sm font-semibold"
      htmlFor={`${ids}${key}`}
    >
      {label}
      <select
        id={`${ids}${key}`}
        value={value}
        onChange={(e) => setPicked({ a, b, [key]: e.target.value })}
        className="min-h-11 rounded-xs border border-line-strong bg-surface px-2 font-normal"
      >
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="font-display font-bold">
        Diff lens on your sandbox
      </figcaption>
      <div className="grid gap-3 sm:grid-cols-2">
        {select("a", "Compare", a)}
        {select("b", "With", b)}
      </div>
      <p className="m-0 text-sm">
        {command ? (
          <>
            Git command: <code className="font-mono">{command}</code>
          </>
        ) : (
          "Pick two different snapshots."
        )}
      </p>
      {lines.length ? (
        <DiffLines lines={lines} />
      ) : command ? (
        <p className="m-0 text-sm text-fg-muted">
          No differences: the two snapshots hold the same files.
        </p>
      ) : null}
    </figure>
  );
}
