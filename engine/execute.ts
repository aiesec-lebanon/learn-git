import type { Dispatched } from "./cli/dispatch";
import { dispatchGit } from "./cli/dispatch";
import { GIT_REGISTRY } from "./commands";
import { refuse } from "./commands/registry";
import type { Invocation, Outcome, World } from "./types";
import { machineOf } from "./world/access";
import { timeAt } from "./world/clock";

/** Runs one simple command. Pure: the input world is never changed. */
export function execute(world: World, invocation: Invocation): Outcome {
  const machine = machineOf(world, invocation.machine);
  const time = timeAt(world.seq);
  const advanced: World = { ...world, seq: world.seq + 1 };
  const argv = invocation.words.map((w) => w.text);
  const [program = ""] = argv;
  const result: Dispatched =
    program === "git"
      ? dispatchGit(advanced, machine, argv.slice(1), time, GIT_REGISTRY)
      : {
          ...refuse(
            "shell-error",
            `bash: ${program}: command not found\n`,
            127,
          ),
          command: program,
          counted: false,
        };
  return {
    world: result.world ?? advanced,
    output: {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
    },
    effects: result.effects ?? [],
    ...(result.request ? { request: result.request } : {}),
    notes: result.notes ?? [],
    meta: {
      command: result.command,
      counted: result.counted,
      ...(result.lines ? { lines: result.lines } : {}),
    },
  };
}
