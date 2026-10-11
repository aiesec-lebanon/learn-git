"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Session } from "@/engine";
import { useAnnounce } from "@/features/announcer/announcer";
import { useLessonSession } from "@/features/lesson/lesson-session";
import {
  aim,
  carryKey,
  move,
  pick,
  type Carry,
} from "@/features/stage/manipulate/pick-and-drop";
import { useDrag } from "@/features/stage/manipulate/use-drag";
import { cx } from "@/lib/cx";
import { CommitGraph } from "../graph";
import { useSandboxView } from "../use-sandbox-view";
import {
  dropOutcome,
  dropTargets,
  targetName,
  type Carried,
  type TargetId,
} from "./targets";

type Item = Carried["kind"];

const chip =
  "inline-flex min-h-11 cursor-grab touch-none items-center gap-2 rounded-sm border-2 border-line-strong bg-surface px-3 font-mono text-sm select-none aria-pressed:border-accent aria-pressed:bg-accent-soft data-dragging:z-10 data-dragging:cursor-grabbing data-dragging:shadow-2";

/**
 * Drag HEAD onto a label or a commit, or drop a new label on a commit: each
 * drop runs the command it stands for in the Your turn sandbox (X-03).
 */
export function PointerDrag({ preview = false }: { preview?: boolean }) {
  const session = useLessonSession();
  return session ? (
    <PointerDragFor session={session} preview={preview} />
  ) : null;
}

/** The same interaction that only shows the command it would run (Orientation). */
export const PointerPreview = () => <PointerDrag preview />;

function PointerDragFor({
  session,
  preview,
}: {
  session: Session;
  preview: boolean;
}) {
  const { view, layout } = useSandboxView(session);
  const say = useAnnounce();
  const help = useId();
  const [name, setName] = useState("");
  const [carry, setCarryState] = useState<Carry<Item, TargetId> | null>(null);
  const latest = useRef(carry);
  const [result, setResult] = useState<string | null>(null);
  const setCarry = (next: Carry<Item, TargetId> | null) => {
    latest.current = next;
    setCarryState(next);
  };

  const carried = (item: Item): Carried =>
    item === "head" ? { kind: "head" } : { kind: "label", name };
  const targets = view ? dropTargets(view) : [];
  const outcome =
    view && carry ? dropOutcome(view, carried(carry.item), carry.target) : null;

  const drop = (c: Carry<Item, TargetId> | null) => {
    setCarry(null);
    if (!c || !view) return;
    const done = dropOutcome(view, carried(c.item), c.target);
    if (!done.ok) {
      setResult(`Snapped back: ${done.reason}`);
      say(`Snapped back. ${done.reason}`);
      return;
    }
    if (preview) {
      setResult(`Would run: ${done.command}`);
      say(`Would run ${done.command}. Nothing ran here.`);
      return;
    }
    session.run(done.command);
    setResult(`Ran: ${done.command}`);
    say(`Ran ${done.command} in your sandbox.`);
  };

  const headDrag = useDrag({
    onStart: () => setCarry({ item: "head", target: null }),
    onAim: (target) => latest.current && setCarry(aim(latest.current, target)),
    onDrop: () => drop(latest.current),
    onCancel: () => setCarry(null),
  });
  const labelDrag = useDrag({
    onStart: () => setCarry({ item: "label", target: null }),
    onAim: (target) => latest.current && setCarry(aim(latest.current, target)),
    onDrop: () => drop(latest.current),
    onCancel: () => setCarry(null),
  });

  const pickUp = (item: Item) => {
    if (carry?.item === item) {
      setCarry(null);
      return say("Put back.");
    }
    const next = pick(item, targets);
    setCarry(next);
    if (view && next.target) {
      const preview = dropOutcome(view, carried(item), next.target);
      say(
        `Picked up ${item === "head" ? "HEAD" : "a new label"}. Over ${targetName(view, next.target)}: ${preview.ok ? preview.command : preview.reason} Arrows choose, Enter drops, Escape puts it back.`,
      );
    }
  };

  const onKeyDown = (event: KeyboardEvent, item: Item) => {
    if (carry?.item !== item) return;
    const action = carryKey(event.key, event.shiftKey);
    if (!action) return;
    event.preventDefault();
    if (action === "drop") return drop(carry);
    if (action === "cancel") {
      setCarry(null);
      return say("Put back.");
    }
    const next = move(carry, targets, action === "next" ? 1 : -1);
    setCarry(next);
    if (view && next.target) {
      const preview = dropOutcome(view, carried(item), next.target);
      say(
        `${targetName(view, next.target)}: ${preview.ok ? preview.command : preview.reason}`,
      );
    }
  };

  if (!view || !layout) return null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption id={help} className="text-sm">
        Drag HEAD onto a branch label or a commit, or drop a new label on a
        commit. You can also tap an item and then tap where it goes. With a
        keyboard: Space picks it up, the arrows choose, Enter drops.
      </figcaption>
      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          aria-pressed={carry?.item === "head"}
          aria-describedby={help}
          onClick={() => pickUp("head")}
          onKeyDown={(e) => onKeyDown(e, "head")}
          {...headDrag}
          className={chip}
        >
          HEAD
        </button>
        <label className="grid gap-1 text-sm">
          New label name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            className="min-h-11 rounded-sm border-2 border-line-strong bg-surface px-3 font-mono"
          />
        </label>
        <button
          type="button"
          aria-pressed={carry?.item === "label"}
          aria-describedby={help}
          onClick={() => pickUp("label")}
          onKeyDown={(e) => onKeyDown(e, "label")}
          {...labelDrag}
          className={chip}
        >
          + new label
        </button>
      </div>
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        drop={{
          aimed: carry?.target ?? null,
          onPress: carry ? (target) => drop(aim(carry, target)) : null,
          head: headDrag,
        }}
      />
      <output
        className={cx(
          "grid min-h-11 content-center rounded-sm px-3 font-mono text-sm",
          outcome && !outcome.ok
            ? "bg-accent-soft text-fg"
            : "bg-term-bg text-term-fg",
        )}
      >
        {outcome
          ? outcome.ok
            ? `Will run: ${outcome.command}`
            : outcome.reason
          : (result ?? "Pick up HEAD or a new label to see its command.")}
      </output>
    </figure>
  );
}
