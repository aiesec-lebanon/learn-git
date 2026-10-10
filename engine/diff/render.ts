import { flag, type ParsedOptions } from "../cli/options";
import type { OptionSpec } from "../cli/options";
import { quotePath } from "../files/quote";
import type { ObjectPool } from "../types";
import { diffStat } from "./stat";
import { unifiedDiff, type FilePair } from "./unified";

export type DiffFormat = "patch" | "stat" | "name-only" | "none";

/** Output-format options shared by `diff`, `show` and `log`. */
export const FORMAT_OPTIONS: readonly OptionSpec[] = [
  { key: "patch", short: "p", long: "patch", negatable: false },
  { key: "patch", short: "u", negatable: false },
  { key: "no-patch", short: "s", long: "no-patch", negatable: false },
  { key: "stat", long: "stat", negatable: false },
  { key: "name-only", long: "name-only", negatable: false },
];

/** The format the options ask for, or `fallback` when none is given. */
export function diffFormat(
  options: ParsedOptions,
  fallback: DiffFormat,
): DiffFormat {
  if (flag(options, "name-only")) return "name-only";
  if (flag(options, "stat")) return "stat";
  if (flag(options, "patch")) return "patch";
  if (flag(options, "no-patch")) return "none";
  return fallback;
}

export function renderDiff(
  pool: ObjectPool,
  pairs: readonly FilePair[],
  format: DiffFormat,
): string {
  switch (format) {
    case "patch":
      return pairs.map((pair) => unifiedDiff(pool, pair)).join("");
    case "stat":
      return diffStat(pairs);
    case "name-only":
      return pairs.map((p) => `${quotePath(p.path)}\n`).join("");
    case "none":
      return "";
  }
}
