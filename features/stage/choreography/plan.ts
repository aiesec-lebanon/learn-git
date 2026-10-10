import type { Effect, Oid } from "@/engine";
import type { Layout, Point } from "@/features/graph/layout";
import type { MotionTokens } from "@/features/motion/policy";

export type ChoreoStep = {
  /** `commit:<oid>`, `edge:<child>:<parent>`, `label:<ref>`, `label:HEAD`, `file:<area>:<path>`. */
  readonly key: string;
  readonly kind: "enter" | "move" | "pulse";
  /** For a move: where the element was, relative to where it is now (FLIP). */
  readonly offset?: Point;
  readonly delay: number;
  readonly duration: number;
  readonly easing: string;
};

export type GraphFrame = { readonly layout: Layout; readonly head: Oid | null };

export type PlanInput = {
  readonly effects: readonly Effect[];
  readonly before: GraphFrame | null;
  readonly after: GraphFrame | null;
  /** The folder file paths are shown relative to (the repository's). */
  readonly root: string;
};

type Draft = Omit<ChoreoStep, "delay">;

const fileStep = (
  area: "worktree" | "index",
  path: string,
  change: "added" | "modified" | "deleted",
  motion: MotionTokens,
): Draft | null =>
  change === "deleted"
    ? null
    : {
        key: `file:${area}:${path}`,
        kind: change === "added" ? "enter" : "pulse",
        duration: motion.quick,
        easing: motion.easing.standard,
      };

/**
 * Orders what changed the way Git does it (ADR-004): files, then the
 * staging area, then the new commit and its arrows, then the labels.
 * Positions come from the layouts, never from the DOM.
 */
export function planChoreography(
  { effects, before, after, root }: PlanInput,
  motion: MotionTokens,
): readonly ChoreoStep[] {
  const phases: Draft[][] = [[], [], [], [], []];
  const prefix = root === "/" ? "/" : `${root}/`;
  const here = (oid: Oid | null, frame: GraphFrame | null) =>
    oid ? frame?.layout.nodes.get(oid) : undefined;
  const move = (key: string, from: Oid | null, to: Oid | null) => {
    const a = here(from, before);
    const b = here(to, after);
    if (!b) return;
    const draw = { duration: motion.draw, easing: motion.easing.stick };
    if (!a) phases[4]?.push({ key, kind: "enter", ...draw });
    else if (a.x !== b.x || a.y !== b.y)
      phases[4]?.push({
        key,
        kind: "move",
        offset: { x: a.x - b.x, y: a.y - b.y },
        ...draw,
      });
  };

  for (const e of effects) {
    if (e.kind === "files-changed") {
      for (const c of e.changes) {
        if (c.node !== "file" || !c.path.startsWith(prefix)) continue;
        const step = fileStep(
          "worktree",
          c.path.slice(prefix.length),
          c.change,
          motion,
        );
        if (step) phases[0]?.push(step);
      }
    } else if (e.kind === "index-changed") {
      for (const c of e.changes) {
        const step = fileStep("index", c.path, c.change, motion);
        if (step) phases[1]?.push(step);
      }
    } else if (e.kind === "object-written" && e.type === "commit") {
      if (!here(e.oid, after)) continue;
      phases[2]?.push({
        key: `commit:${e.oid}`,
        kind: "enter",
        duration: motion.draw,
        easing: motion.easing.draw,
      });
      for (const edge of after?.layout.edges ?? []) {
        if (edge.child === e.oid)
          phases[3]?.push({
            key: `edge:${edge.key}`,
            kind: "enter",
            duration: motion.draw,
            easing: motion.easing.draw,
          });
      }
    } else if (e.kind === "ref-updated") {
      move(`label:${e.ref}`, e.from, e.to);
    }
  }
  if (after && (before?.head ?? null) !== after.head)
    move("label:HEAD", before?.head ?? null, after.head);

  const steps: ChoreoStep[] = [];
  let start = 0;
  for (const phase of phases) {
    let end = start;
    phase.forEach((draft, i) => {
      const delay = start + i * motion.stagger;
      steps.push({ ...draft, delay });
      end = Math.max(end, delay + draft.duration);
    });
    start = end;
  }
  return steps;
}
