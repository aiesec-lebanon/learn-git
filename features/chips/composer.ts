import { shellQuote } from "@/engine";
import type { ChipVerb } from "./palette";

/** One entry per parameter, by position: a toggle, a text or picked paths. */
export type ParamValue = boolean | string | readonly string[];
export type ParamValues = readonly (ParamValue | undefined)[];

const filled = (value: ParamValue | undefined) =>
  typeof value === "string"
    ? value.trim() !== ""
    : Array.isArray(value)
      ? value.length > 0
      : value === true;

/** The label of the first required parameter still empty, or null when the command can run. */
export function missing(verb: ChipVerb, values: ParamValues): string | null {
  const gap = verb.params.find(
    (p, i) => p.kind !== "flag" && p.required && !filled(values[i]),
  );
  return gap ? gap.label : null;
}

/** The command line the chips stand for, with every argument safely quoted. */
export function compose(verb: ChipVerb, values: ParamValues): string {
  const words = verb.program === "git" ? ["git", verb.name] : [verb.name];
  verb.params.forEach((param, i) => {
    const value = values[i];
    if (!filled(value)) return;
    if (param.kind === "flag") words.push(param.flag);
    else if (param.kind === "value") {
      if (param.flag) words.push(param.flag);
      words.push(shellQuote(String(value).trim()));
    } else words.push(...(value as readonly string[]).map(shellQuote));
  });
  return words.join(" ");
}
