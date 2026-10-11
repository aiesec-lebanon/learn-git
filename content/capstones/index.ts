import type { CapstoneScene } from "../define";
import type { ChapterId } from "../registry";
import b1 from "./b1";
import b2 from "./b2";
import b3 from "./b3";
import b4 from "./b4";
import b5 from "./b5";
import b6 from "./b6";

/** Capstones that are written; a chapter without one shows none. */
export const CAPSTONES: Partial<Record<ChapterId, CapstoneScene>> = {
  b1,
  b2,
  b3,
  b4,
  b5,
  b6,
};

export const readyCapstones = (): readonly CapstoneScene[] =>
  Object.values(CAPSTONES);
