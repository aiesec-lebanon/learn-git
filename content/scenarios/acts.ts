import { createWorld, match, Session, type World } from "@/engine";
import type { ScenarioScene } from "../define";

/** Acts a world shows reached; acts come in order, so a later act counts the earlier ones. */
export function actsReached(scene: ScenarioScene, world: World): number {
  for (let i = scene.acts.length - 1; i >= 0; i--) {
    if (scene.acts[i]?.targets.some((t) => match(world, t).ok)) return i + 1;
  }
  return 0;
}

/** The first expert path's lines up to the point where `acts` acts are reached (to re-seed a resumed scenario). */
export function seedLines(scene: ScenarioScene, acts: number): string[] {
  if (acts <= 0) return [];
  const session = new Session(createWorld(scene.world));
  const lines: string[] = [];
  for (const line of scene.experts[0].solution) {
    session.run(line);
    lines.push(line);
    if (actsReached(scene, session.getSnapshot().world) >= acts) break;
  }
  return lines;
}
