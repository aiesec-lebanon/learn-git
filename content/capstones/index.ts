import type { CapstoneScene } from "../define";
import type { ChapterId } from "../registry";
import b1 from "./b1";
import b2 from "./b2";

/** Capstones that are written; a chapter without one shows none. */
export const CAPSTONES: Partial<Record<ChapterId, CapstoneScene>> = { b1, b2 };

export const readyCapstones = (): readonly CapstoneScene[] =>
  Object.values(CAPSTONES);
