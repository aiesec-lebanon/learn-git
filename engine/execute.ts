import type { Dispatched } from "./cli/dispatch";
import { dispatchGit } from "./cli/dispatch";
import { GIT_REGISTRY } from "./commands";
import type { CommandResult } from "./commands/registry";
import { shellMessages } from "./messages/shell";
import { SHELL_REGISTRY } from "./shell";
import { expandWord } from "./shell/glob";
import { closeRedirect, openRedirect } from "./shell/redirect";
import { shellFail } from "./shell/registry";
import type { Invocation, Machine, Outcome, World } from "./types";
import { machineOf } from "./world/access";
import { timeAt } from "./world/clock";

function runProgram(
  world: World,
  machine: Machine,
  argv: readonly string[],
  time: number,
): Dispatched {
  const [program, ...args] = argv;
  if (program === undefined) return { command: "", counted: false };
  if (program === "git")
    return dispatchGit(world, machine, args, time, GIT_REGISTRY);
  const shell = SHELL_REGISTRY.get(program);
  const result: CommandResult = shell
    ? shell.run({ world, machine, args, time })
    : shellFail(shellMessages.notFound(program), 127);
  return { ...result, command: program, counted: false };
}

/** Runs one simple command. Pure: the input world is never changed. */
export function execute(world: World, invocation: Invocation): Outcome {
  const time = timeAt(world.seq);
  let current: World = { ...world, seq: world.seq + 1 };
  const machine = machineOf(current, invocation.machine);
  const argv = invocation.words.flatMap((w) =>
    expandWord(machine.fs, machine.cwd, w),
  );
  let result: Dispatched;
  if (invocation.redirect) {
    const opened = openRedirect(current, machine, invocation.redirect);
    if ("error" in opened) {
      result = { ...opened.error, command: argv[0] ?? "", counted: false };
    } else {
      current = opened.world;
      const ran = runProgram(
        current,
        machineOf(current, machine.id),
        argv,
        time,
      );
      result = {
        ...closeRedirect(opened, machine, ran),
        command: ran.command,
        counted: ran.counted,
      };
    }
  } else {
    result = runProgram(current, machine, argv, time);
  }
  return {
    world: result.world ?? current,
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
