import { SHELL_REGISTRY } from "../shell";
import { GIT_REGISTRY } from "./index";

/** What the UI may know about a command: completion, chips, `-h` routing. */
export type CommandInfo = {
  readonly program: "git" | "shell";
  readonly name: string;
  /** Counts toward par when it changes state. */
  readonly counted: boolean;
  /** An older form (no chip; the reference maps it to the modern command). */
  readonly legacy: boolean;
  /** Simulated option spellings, e.g. `-m` and `--message`. */
  readonly flags: readonly string[];
};

export function commands(): readonly CommandInfo[] {
  return [
    ...[...GIT_REGISTRY.values()].map((c) => ({
      program: "git" as const,
      name: c.name,
      counted: c.counted,
      legacy: c.legacy === true,
      flags: c.options
        .filter((o) => !o.key.startsWith("x-"))
        .flatMap((o) => [
          ...(o.short ? [`-${o.short}`] : []),
          ...(o.long ? [`--${o.long}`] : []),
        ]),
    })),
    ...[...SHELL_REGISTRY.keys()].map((name) => ({
      program: "shell" as const,
      name,
      counted: false,
      legacy: false,
      flags: [],
    })),
  ];
}
