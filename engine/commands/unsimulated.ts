import type { OptionSpec, ParsedOptions } from "../cli/options";
import { notSimulated } from "../messages/git";
import { refuse, type CommandResult } from "./registry";

/** An option Git has that the sandbox recognises only to say it is not simulated. */
export const unsimulated = (
  long: string,
  short?: string,
  value?: "required" | "optional",
): OptionSpec => ({
  key: `x-${long}`,
  ...(long.length > 1 ? { long } : {}),
  ...(short ? { short } : {}),
  ...(value ? { value } : {}),
});

/** The "not simulated here" answer for the first unsimulated option given, or null. */
export function refuseUnsimulated(
  command: string,
  options: ParsedOptions,
): CommandResult | null {
  const key = [...options.values.keys()].find((k) => k.startsWith("x-"));
  if (!key) return null;
  const name = key.slice(2);
  return refuse(
    "not-simulated",
    notSimulated(`git ${command} ${name.length > 1 ? "--" : "-"}${name}`),
    1,
  );
}
