import type { ScenarioScene } from "../define";
import type { ScenarioId } from "../registry";
import sB2 from "./s-b2";
import sB3 from "./s-b3";

/** Scenes of the ready scenarios. */
export const SCENARIO_SCENES: Partial<Record<ScenarioId, ScenarioScene>> = {
  "s-b2": sB2,
  "s-b3": sB3,
};
