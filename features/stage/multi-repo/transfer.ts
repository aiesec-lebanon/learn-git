import type { Effect, RepoId } from "@/engine";
import type { Layout } from "@/features/graph/layout";
import type { MotionTokens } from "@/features/motion/policy";
import type { ChoreoStep } from "../choreography/plan";

/** One graph on the stage: its key prefix and its layouts around the change. */
export type ScopedGraph = {
  readonly scope: string;
  readonly before: Layout | null;
  readonly after: Layout | null;
};

/**
 * Motion for what crossed the network (ADR-004 ordering, after the local
 * steps that end at `start`): commits fly from the repository that sent
 * them (or appear when it is not on the stage), then labels in other
 * repositories move.
 */
export function planTransfers(
  effects: readonly Effect[],
  graphs: ReadonlyMap<RepoId, ScopedGraph>,
  main: RepoId | null,
  start: number,
  motion: MotionTokens,
): readonly ChoreoStep[] {
  const flights: Omit<ChoreoStep, "delay">[] = [];
  const moves: Omit<ChoreoStep, "delay">[] = [];
  for (const e of effects) {
    if (e.kind === "transfer") {
      const to = graphs.get(e.to);
      const from = graphs.get(e.from);
      if (!to?.after) continue;
      for (const oid of e.oids) {
        if (!to.after.nodes.has(oid)) continue;
        const flies = !!from?.after?.nodes.has(oid);
        flights.push({
          key: `${to.scope}commit:${oid}`,
          kind: flies ? "copy" : "enter",
          ...(flies ? { from: `${from?.scope}commit:${oid}` } : {}),
          duration: motion.draw,
          easing: motion.easing.draw,
        });
      }
    } else if (
      e.kind === "object-written" &&
      e.type === "commit" &&
      e.repo !== main
    ) {
      const graph = graphs.get(e.repo);
      if (!graph?.after?.nodes.has(e.oid)) continue;
      flights.push({
        key: `${graph.scope}commit:${e.oid}`,
        kind: "enter",
        duration: motion.draw,
        easing: motion.easing.draw,
      });
    } else if (e.kind === "ref-updated" && e.repo !== main) {
      const graph = graphs.get(e.repo);
      const a = e.from ? graph?.before?.nodes.get(e.from) : undefined;
      const b = e.to ? graph?.after?.nodes.get(e.to) : undefined;
      if (!graph || !b) continue;
      const key = `${graph.scope}label:${e.ref}`;
      const draw = { duration: motion.draw, easing: motion.easing.stick };
      if (!a) moves.push({ key, kind: "enter", ...draw });
      else if (a.x !== b.x || a.y !== b.y)
        moves.push({
          key,
          kind: "move",
          offset: { x: a.x - b.x, y: a.y - b.y },
          ...draw,
        });
    }
  }
  const steps: ChoreoStep[] = [];
  let at = start;
  for (const phase of [flights, moves]) {
    let end = at;
    phase.forEach((draft, i) => {
      const delay = at + i * motion.stagger;
      steps.push({ ...draft, delay });
      end = Math.max(end, delay + draft.duration);
    });
    at = end;
  }
  return steps;
}
