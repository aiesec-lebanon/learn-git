import type { ScenarioScene } from "../define";
import type { ScenarioId } from "../registry";
import sB2 from "./s-b2";

/** Scenes of the ready scenarios. */
export const SCENARIO_SCENES: Partial<Record<ScenarioId, ScenarioScene>> = {
  "s-b2": sB2,
};
