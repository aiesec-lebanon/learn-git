import type { OptionError } from "../cli/options";
import { usageBlock } from "./git";

/**
 * Git's option errors (exit 129). Git also prints the full option table
 * after the synopsis; the sandbox prints the synopsis and leaves the table
 * to the reference entry.
 */
export function optionErrorOutput(
  error: Exclude<OptionError, { kind: "help" }>,
  usage: readonly string[],
): { stdout: string; stderr: string } {
  const synopsis = `${usageBlock(usage)}\n`;
  switch (error.kind) {
    case "unknown-option":
      return {
        stdout: "",
        stderr: `error: unknown option \`${error.name}'\n${synopsis}`,
      };
    case "unknown-switch":
      return {
        stdout: "",
        stderr: `error: unknown switch \`${error.name}'\n${synopsis}`,
      };
    case "ambiguous":
      return {
        stdout: synopsis,
        stderr: `error: ambiguous option: ${error.name} (could be ${error.candidates[0]} or ${error.candidates[1]})\n`,
      };
    case "switch-requires-value":
      return {
        stdout: "",
        stderr: `error: switch \`${error.name}' requires a value\n`,
      };
    case "option-requires-value":
      return {
        stdout: "",
        stderr: `error: option \`${error.name}' requires a value\n`,
      };
    case "takes-no-value":
      return {
        stdout: "",
        stderr: `error: option \`${error.name}' takes no value\n`,
      };
  }
}
