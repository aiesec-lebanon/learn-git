import { expect, it } from "vitest";
import { createWorld, Session, type WorldSpec } from "@/engine";
import { CAPSTONES } from "./capstones";
import { runStep, type Step } from "./define";
import { SCENES } from "./lessons";
import { SCENARIO_SCENES } from "./scenarios";

/** ADR-014: p95 per command 16 ms on Beginner worlds; CI fails only at 3x until PERF_STRICT=1. */
const BUDGET_MS = 16 * (process.env.PERF_STRICT ? 1 : 3);

const paths: { world: WorldSpec; solution: readonly Step[] }[] = [
  ...Object.values(SCENES).flatMap((s) => (s ? [s.yourTurn] : [])),
  ...Object.values(CAPSTONES).flatMap((c) => (c ? [c] : [])),
  ...Object.values(SCENARIO_SCENES).flatMap((s) =>
    s ? [{ world: s.world, solution: s.experts[0].solution }] : [],
  ),
];

it("replays every Beginner solution within the per-command budget", () => {
  const times: number[] = [];
  for (const { world, solution } of paths) {
    const session = new Session(createWorld(world));
    for (const step of solution) {
      const start = performance.now();
      runStep(session, step);
      times.push(performance.now() - start);
    }
  }
  times.sort((a, b) => a - b);
  const p95 = times[Math.ceil(times.length * 0.95) - 1] ?? 0;
  expect(times.length).toBeGreaterThan(100);
  expect(p95, `p95 ${p95.toFixed(1)} ms`).toBeLessThan(BUDGET_MS);
});
