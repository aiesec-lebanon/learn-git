import { shellQuote, tokenize } from "./cli/tokenize";
import { execute } from "./execute";
import { tokenizeErrorOutput } from "./messages/shell";
import type { Invocation, MachineId, Outcome, World } from "./types";
import { machineOf } from "./world/access";

/** One invocation as text, quoted so it reads back the same. */
export function invocationText(
  invocation: Omit<Invocation, "machine">,
): string {
  const word = (w: Invocation["words"][number]) =>
    w.pattern === undefined ? shellQuote(w.text) : w.text;
  const words = invocation.words.map(word);
  const { redirect } = invocation;
  if (redirect) words.push(redirect.op, word(redirect.target));
  return words.join(" ");
}

/**
 * Runs one typed line: `&&` stops at the first failure, `;` and newlines
 * always continue. A line the shell cannot parse is one failed invocation.
 * A command waiting for its editor ends the line (the rest is dropped).
 * `texts[i]` is the command text of `outcomes[i]`.
 */
export function runLine(
  world: World,
  line: string,
  machine?: MachineId,
): {
  world: World;
  outcomes: readonly Outcome[];
  texts: readonly string[];
} {
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
    return { world: next, outcomes: [outcome], texts: [line] };
  }
  const outcomes: Outcome[] = [];
  const texts: string[] = [];
  let current = world;
  let skip = false;
  for (const step of parsed.steps) {
    if (!skip) {
      const outcome = execute(
        current,
        machine ? { ...step.command, machine } : step.command,
      );
      outcomes.push(outcome);
      texts.push(invocationText(step.command));
      current = outcome.world;
      if (outcome.request?.kind === "editor") break;
      skip = step.next === "&&" && outcome.output.exitCode !== 0;
    } else {
      skip = step.next === "&&";
    }
  }
  return { world: current, outcomes, texts };
}
