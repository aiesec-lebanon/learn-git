import type { Point } from "@/features/graph/layout";
import type { ChoreoStep } from "./plan";

/** Where `from` sits relative to `el`, so a copy can start there. */
function offsetFrom(root: ParentNode, el: Element, from?: string) {
  const source = from
    ? root.querySelector(`[data-choreo="${CSS.escape(from)}"]`)
    : null;
  if (!source) return null;
  const a = source.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top };
}

function keyframes(step: ChoreoStep, offset: Point | null): Keyframe[] {
  switch (step.kind) {
    case "copy":
      return offset
        ? [
            {
              opacity: 0.5,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            },
            { opacity: 1, transform: "none" },
          ]
        : keyframes({ ...step, kind: "enter" }, null);
    case "enter":
      return [
        { opacity: 0, transform: "scale(0.85)" },
        { opacity: 1, transform: "none" },
      ];
    case "move": {
      const { x, y } = step.offset ?? { x: 0, y: 0 };
      return [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: "none" },
      ];
    }
    case "pulse":
      return [
        { transform: "none" },
        { transform: "scale(1.06)" },
        { transform: "none" },
      ];
  }
}

export type Timeline = {
  readonly duration: number;
  pause(): void;
  play(): void;
  /** Shows the frame at `ms` from the start. */
  seek(ms: number): void;
  /** Jumps to the end state. */
  finish(): void;
};

/**
 * Plays steps on the elements marked `data-choreo="<key>"` inside `root`,
 * with the Web Animations API on transform and opacity only.
 */
export function playChoreography(
  root: ParentNode,
  steps: readonly ChoreoStep[],
): Timeline {
  const animations: Animation[] = [];
  for (const step of steps) {
    const el = root.querySelector(`[data-choreo="${CSS.escape(step.key)}"]`);
    if (!el) continue;
    animations.push(
      el.animate(keyframes(step, offsetFrom(root, el, step.from)), {
        delay: step.delay,
        duration: step.duration,
        easing: step.easing,
        fill: "backwards",
      }),
    );
  }
  const duration = Math.max(0, ...steps.map((s) => s.delay + s.duration));
  return {
    duration,
    pause: () => animations.forEach((a) => a.pause()),
    play: () => animations.forEach((a) => a.play()),
    seek: (ms) =>
      animations.forEach((a) => {
        a.currentTime = ms;
      }),
    finish: () =>
      animations.forEach((a) => {
        if (a.playState !== "finished") a.finish();
      }),
  };
}
