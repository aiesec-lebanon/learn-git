"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useMotion } from "@/features/motion/policy";
import type { StageFrame } from "@/features/stage/frame";
import { StageView } from "@/features/stage/stage";
import { Button } from "@/ui/button";
import { beatHeadingId } from "./content";
import type { BeatFrame, TranscriptLine } from "./frames";

/** The beat crossing this line is the active one: below the pinned stage on phones. */
const readingLine = () => {
  const top = matchMedia("(min-width: 48rem)").matches ? 30 : 60;
  return `-${top}% 0px -${99 - top}% 0px`;
};

type Position = {
  readonly index: number;
  /** Animate the move: one beat forward, or a replay. */
  readonly play: boolean;
  /** A new object on every move, so a replay animates again. */
  readonly frame: StageFrame;
};

const moveTo =
  (frames: readonly BeatFrame[], next: number) =>
  (p: Position): Position => {
    const frame = frames[next]?.stage;
    if (p.index === next || !frame) return p;
    return { index: next, play: next === p.index + 1, frame: { ...frame } };
  };

function Transcript({ lines }: { lines: readonly TranscriptLine[] }) {
  if (!lines.length) return null;
  return (
    <div className="rounded-sm bg-term-bg p-3 font-mono text-sm text-term-fg">
      {lines.map((line, i) => (
        <div key={i}>
          <pre className="m-0 whitespace-pre-wrap break-words text-term-accent">
            <span aria-hidden="true">$ </span>
            {line.command}
          </pre>
          {line.stdout ? (
            <pre className="m-0 whitespace-pre-wrap break-words">
              {line.stdout}
            </pre>
          ) : null}
          {line.stderr ? (
            <pre className="m-0 whitespace-pre-wrap break-words text-term-err">
              {line.stderr}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Scroll-told beats beside a pinned stage (ADR-004). With reduced motion the
 * beats become steps: one at a time, moved by Previous and Next.
 */
export function LessonScroller({
  frames,
  children,
}: {
  frames: readonly BeatFrame[];
  children: ReactNode;
}) {
  const stepped = useMotion() === "reduce";
  const [position, setPosition] = useState<Position>(() => ({
    index: 0,
    play: false,
    frame: { ...(frames[0]?.stage as StageFrame) },
  }));
  const prose = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  const last = frames.length - 1;
  const { index } = position;
  const current = frames[index];

  const show = (next: number) => setPosition(moveTo(frames, next));
  const replay = () =>
    setPosition((p) => ({ ...p, play: true, frame: { ...p.frame } }));

  const go = (next: number) => {
    if (next < 0 || next > last) return;
    focusPending.current = true;
    show(next);
  };

  useEffect(() => {
    const root = prose.current;
    if (stepped || !root) return;
    const ids = frames.map((f) => f.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const at = ids.indexOf(entry.target.getAttribute("data-beat") ?? "");
          if (entry.isIntersecting && at >= 0) setPosition(moveTo(frames, at));
        }
      },
      { rootMargin: readingLine() },
    );
    for (const el of root.querySelectorAll("[data-beat]")) observer.observe(el);
    return () => observer.disconnect();
  }, [stepped, frames]);

  useLayoutEffect(() => {
    const root = prose.current;
    if (!root) return;
    const sections = [...root.querySelectorAll<HTMLElement>("[data-beat]")];
    sections.forEach((el, i) => (el.hidden = stepped && i !== index));
    if (focusPending.current) {
      focusPending.current = false;
      const id = frames[index]?.id;
      const heading = id ? document.getElementById(beatHeadingId(id)) : null;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    }
    return () => sections.forEach((el) => (el.hidden = false));
  }, [stepped, index, frames]);

  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    go(index + step);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10">
      <section
        aria-label="Lesson stage"
        className="sticky top-16 z-10 -mx-4 grid max-h-[45dvh] gap-3 overflow-y-auto border-b border-line bg-bg px-4 py-3 sm:-mx-6 sm:px-6 md:top-20 md:col-start-2 md:row-start-1 md:mx-0 md:max-h-[calc(100dvh-6rem)] md:self-start md:border-0 md:p-0"
      >
        <div
          role="group"
          aria-label="Beats"
          className="flex flex-wrap items-center gap-2"
        >
          <Button
            onClick={() => go(index - 1)}
            onKeyDown={onKeyDown}
            disabled={index === 0}
          >
            Previous
          </Button>
          <Button
            onClick={() => go(index + 1)}
            onKeyDown={onKeyDown}
            disabled={index === last}
          >
            Next
          </Button>
          <span className="text-sm text-fg-muted">
            Beat {index + 1} of {frames.length}
          </span>
          {!stepped && current?.stage.effects.length ? (
            <Button variant="quiet" onClick={replay}>
              Replay
            </Button>
          ) : null}
        </div>
        {current ? <Transcript lines={current.transcript} /> : null}
        <StageView frame={position.frame} animate={position.play} />
      </section>
      <div ref={prose} className="md:col-start-1 md:row-start-1">
        {children}
      </div>
    </div>
  );
}
