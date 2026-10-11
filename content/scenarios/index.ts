import type { ScenarioScene } from "../define";
import type { ScenarioId } from "../registry";
import sB1 from "./s-b1";
import sB2 from "./s-b2";
import sB3 from "./s-b3";
import sB4 from "./s-b4";

/** Scenes of the ready scenarios. */
export const SCENARIO_SCENES: Partial<Record<ScenarioId, ScenarioScene>> = {
  "s-b1": sB1,
  "s-b2": sB2,
  "s-b3": sB3,
  "s-b4": sB4,
};
