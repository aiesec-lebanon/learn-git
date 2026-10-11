import type { ScenarioScene } from "../define";
import type { ScenarioId } from "../registry";

/** Scenes of the ready scenarios. */
export const SCENARIO_SCENES: Partial<Record<ScenarioId, ScenarioScene>> = {};
