import { tokenize } from "./cli/tokenize";
import { execute } from "./execute";
import { tokenizeErrorOutput } from "./messages/shell";
import type { MachineId, Outcome, World } from "./types";
import { machineOf } from "./world/access";

/**
 * Runs one typed line: `&&` stops at the first failure, `;` and newlines
 * always continue. A line the shell cannot parse is one failed invocation.
 */
export function runLine(
  world: World,
  line: string,
  machine?: MachineId,
): { world: World; outcomes: readonly Outcome[] } {
  const parsed = tokenize(line, machineOf(world, machine).home);
  if (!parsed.ok) {
    const { stderr, exitCode } = tokenizeErrorOutput(parsed.error);
    const next = { ...world, seq: world.seq + 1 };
    const outcome: Outcome = {
      world: next,
      output: { stdout: "", stderr, exitCode },
      effects: [{ kind: "refused", code: "shell-error" }],
      notes: [],
      meta: { command: "", counted: false },
    };
    return { world: next, outcomes: [outcome] };
  }
  const outcomes: Outcome[] = [];
  let current = world;
  let skip = false;
  for (const step of parsed.steps) {
    if (!skip) {
      const outcome = execute(
        current,
        machine ? { ...step.command, machine } : step.command,
      );
      outcomes.push(outcome);
      current = outcome.world;
      skip = step.next === "&&" && outcome.output.exitCode !== 0;
    } else {
      skip = step.next === "&&";
    }
  }
  return { world: current, outcomes };
}
