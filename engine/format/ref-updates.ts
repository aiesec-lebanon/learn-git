import { abbreviate } from "../objects/abbrev";
import type { ObjectPool, Oid } from "../types";

const SUMMARY_WIDTH = 17;

export type RefUpdate = {
  /** ` ` fast-forward, `+` forced, `*` new, `-` deleted, `!` rejected, `=` up to date. */
  readonly code: string;
  readonly summary: string;
  readonly from: string;
  readonly to: string;
  /** Printed after the line as is, e.g. `  (forced update)` or ` (fetch first)`. */
  readonly suffix?: string;
};

/** `old..new` for a fast-forward, `old...new` for a forced update. */
export function rangeSummary(
  pool: ObjectPool,
  from: Oid,
  to: Oid,
  forced: boolean,
): string {
  const dots = forced ? "..." : "..";
  return `${abbreviate(pool, from)}${dots}${abbreviate(pool, to)}`;
}

/**
 * One ref-update line as fetch and push print them. Fetch pads the source
 * column to `width` (at least 10); push does not pad it.
 */
export function refUpdateLine(update: RefUpdate, width?: number): string {
  const from = width === undefined ? update.from : update.from.padEnd(width);
  return ` ${update.code} ${update.summary.padEnd(SUMMARY_WIDTH)} ${from} -> ${update.to}${update.suffix ?? ""}\n`;
}
