"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Session } from "@/engine";
import { useAnnounce } from "@/features/announcer/announcer";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { FileStateChip } from "@/features/stage/file-card";
import { stageFiles } from "@/features/stage/files";
import {
  aim,
  carryKey,
  move,
  pick,
  type Carry,
} from "@/features/stage/manipulate/pick-and-drop";
import { DROP_ATTR, useDrag } from "@/features/stage/manipulate/use-drag";
import { useSession } from "@/features/stage/use-session";
import { Button } from "@/ui/button";
import { carryable, dropCommand, STAGING, TARGETS } from "./stage-files.model";

const zone =
  "grid min-w-0 content-start gap-2 rounded-sm border-2 bg-surface p-3";

/** Drag or tap a changed file into the staging area: the same as `git add <file>`, run in your Your turn sandbox. */
export function StageFiles() {
  const session = useLessonSession();
  return session ? <StageFilesFor session={session} /> : null;
}

function StageFilesFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const files = useMemo(() => stageFiles(world), [world]);
  const say = useAnnounce();
  const [carry, setCarryState] = useState<Carry<string, string> | null>(null);
  const latest = useRef(carry);
  const pressed = useRef<string | null>(null);
  const setCarry = (next: Carry<string, string> | null) => {
    latest.current = next;
    setCarryState(next);
  };
  const [ran, setRan] = useState<string | null>(null);
  const help = useId();
  const preview = carry ? dropCommand(carry.item, carry.target) : null;
  const movable = new Set(carryable(files).map((f) => f.path));

  const drop = (c: Carry<string, string> | null) => {
    setCarry(null);
    const command = c ? dropCommand(c.item, c.target) : null;
    if (!command) {
      if (c) say(`${c.item} put back.`);
      return;
    }
    session.run(command);
    setRan(command);
    say(`Ran ${command} in your sandbox.`);
  };

  const drag = useDrag({
    onStart: () =>
      pressed.current && setCarry({ item: pressed.current, target: null }),
    onAim: (target) => latest.current && setCarry(aim(latest.current, target)),
    onDrop: () => drop(latest.current),
    onCancel: () => setCarry(null),
  });

  const onKeyDown = (event: KeyboardEvent, path: string) => {
    if (carry?.item !== path) return;
    const action = carryKey(event.key, event.shiftKey);
    if (!action) return;
    event.preventDefault();
    if (action === "drop") drop(carry);
    else if (action === "cancel") {
      setCarry(null);
      say(`${path} put back.`);
    } else setCarry(move(carry, TARGETS, action === "next" ? 1 : -1));
  };

  const pickUp = (path: string) => {
    if (carry?.item === path) {
      setCarry(null);
      return say(`${path} put back.`);
    }
    const next = pick(path, TARGETS);
    setCarry(next);
    say(
      `Picked up ${path}. Over the staging area: ${dropCommand(path, next.target)}. Enter to drop, Escape to put it back.`,
    );
  };

  if (files.index === null) return null;
  const over = carry?.target === STAGING;

  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption id={help} className="text-sm">
        Drag a changed file into the staging area, or tap it and then tap the
        staging area. With a keyboard: Space picks it up, Enter drops it.
      </figcaption>
      <div className="grid gap-3 sm:grid-cols-2">
        <section aria-label="Working tree" className={`${zone} border-line`}>
          <h4 className="m-0 font-display font-bold">Working tree</h4>
          <ul className="m-0 grid list-none gap-1 p-0">
            {files.worktree.map((file) =>
              movable.has(file.path) ? (
                <li key={file.path}>
                  <button
                    type="button"
                    aria-pressed={carry?.item === file.path}
                    aria-describedby={help}
                    onClick={() => pickUp(file.path)}
                    onKeyDown={(e) => onKeyDown(e, file.path)}
                    {...drag}
                    onPointerDown={(e) => {
                      pressed.current = file.path;
                      drag.onPointerDown(e);
                    }}
                    className="relative flex min-h-11 w-full cursor-grab touch-none items-center gap-2 rounded-sm border-2 border-line-strong bg-surface px-3 text-left select-none aria-pressed:border-accent aria-pressed:bg-accent-soft data-dragging:z-10 data-dragging:cursor-grabbing data-dragging:shadow-2"
                  >
                    <code className="min-w-0 truncate text-sm">
                      <bdi>{file.path}</bdi>
                    </code>
                    {file.state ? <FileStateChip state={file.state} /> : null}
                  </button>
                </li>
              ) : (
                <li
                  key={file.path}
                  className="flex min-h-11 min-w-0 items-center gap-2 border-2 border-transparent px-3"
                >
                  <code className="min-w-0 truncate text-sm">
                    <bdi>{file.path}</bdi>
                  </code>
                  <FileStateChip state={file.state ?? "unmodified"} />
                </li>
              ),
            )}
          </ul>
        </section>
        <section
          aria-label="Staging area"
          {...{ [DROP_ATTR]: STAGING }}
          className={`${zone} ${over ? "border-accent bg-accent-soft" : "border-dashed border-line-strong"}`}
        >
          <h4 className="m-0 font-display font-bold">
            Staging area
            {over ? (
              <span className="ml-2 text-xs font-semibold">drop here</span>
            ) : null}
          </h4>
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {files.index.map((file) => (
              <li
                key={file.path}
                className="flex min-h-7 min-w-0 items-center gap-2"
              >
                <code className="min-w-0 truncate text-sm">
                  <bdi>{file.path}</bdi>
                </code>
                {file.state && file.state !== "unmodified" ? (
                  <FileStateChip state={file.state} />
                ) : null}
              </li>
            ))}
          </ul>
          {carry ? (
            <Button variant="primary" onClick={() => drop(aim(carry, STAGING))}>
              Drop {carry.item} here
            </Button>
          ) : null}
        </section>
      </div>
      <output className="grid min-h-11 content-center rounded-sm bg-term-bg px-3 font-mono text-sm text-term-fg">
        {preview
          ? `Will run: ${preview}`
          : ran
            ? `Ran: ${ran}`
            : "Pick a file to see its command."}
      </output>
    </figure>
  );
}
