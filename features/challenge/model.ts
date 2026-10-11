import {
  countsForPar,
  createWorld,
  Session,
  type HistoryEntry,
  type WorldSpec,
} from "@/engine";
import { runStep, type Challenge, type Step } from "@/content/define";
import { stageFrame, type StageFrame } from "@/features/stage/frame";

/** The quiet line shown once a puzzle is solved (LD 6). */
export const solvedLine = (steps: number, par: number): string =>
  `Solved in ${steps} · par ${par}`;

/** One counted step of a path and the stage after it. */
export type PathStep = { readonly text: string; readonly frame: StageFrame };

/**
 * Groups history into counted steps: free entries before a counted one and
 * teammates' reactions right after it belong to it; trailing ones join the last.
 */
export function pathSteps(history: readonly HistoryEntry[]): PathStep[] {
  const groups: HistoryEntry[][] = [];
  let pending: HistoryEntry[] = [];
  for (const entry of history) {
    const last = groups.at(-1);
    if (entry.actor !== undefined && pending.length === 0 && last) {
      last.push(entry);
    } else {
      pending.push(entry);
      if (countsForPar(entry)) {
        groups.push(pending);
        pending = [];
      }
    }
  }
  groups.at(-1)?.push(...pending);
  return groups.map((group) => {
    const counted = group.find(countsForPar) as HistoryEntry;
    const end = group.at(-1) as HistoryEntry;
    return {
      text: counted.text,
      frame: stageFrame(
        end.outcome.world,
        group.flatMap((e) => e.outcome.effects),
      ),
    };
  });
}

/** The steps replayed on a fresh copy of the world. */
function replay(world: WorldSpec, steps: readonly Step[]) {
  const session = new Session(createWorld(world));
  for (const step of steps) runStep(session, step);
  return session.getSnapshot().history;
}

/** The par path: the reference solution replayed on the puzzle's start world. */
export const parPath = (challenge: Challenge): PathStep[] =>
  pathSteps(replay(challenge.world, challenge.solution));

const countedTexts = (history: readonly HistoryEntry[]) =>
  history.filter(countsForPar).map((e) => e.text);

export const startFrame = (world: WorldSpec): StageFrame =>
  stageFrame(createWorld(world), []);

/** "git commit -m x" → "git commit"; "Hub: merge pull request #1" → "Hub: merge". */
const shape = (text: string) => text.trim().split(/\s+/).slice(0, 2).join(" ");

const GENERIC_UNDER_PAR =
  "Your path is shorter than the reference solution and reaches the same target, so it works.";

/** Why a path under par works: the recorded explanation of the same shape, else a general one. */
export function underParWhy(
  history: readonly HistoryEntry[],
  challenge: Challenge,
): string | null {
  const texts = countedTexts(history);
  if (texts.length >= challenge.par) return null;
  const shapeOf = (list: readonly string[]) => list.map(shape).join("\n");
  const known = challenge.underPar?.find(
    (path) =>
      shapeOf(countedTexts(replay(challenge.world, path.solution))) ===
      shapeOf(texts),
  );
  return known?.why ?? GENERIC_UNDER_PAR;
}
