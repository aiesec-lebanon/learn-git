import type { Dispatched } from "./cli/dispatch";
import { dispatchGit } from "./cli/dispatch";
import { GIT_REGISTRY } from "./commands";
import type { CommandResult } from "./commands/registry";
import { invariant } from "./errors";
import { act } from "./hub/actions";
import { shellMessages } from "./messages/shell";
import { SHELL_REGISTRY } from "./shell";
import { expandWord } from "./shell/glob";
import { closeRedirect, openRedirect } from "./shell/redirect";
import { shellFail } from "./shell/registry";
import type {
  HubInvocation,
  Invocation,
  Machine,
  Outcome,
  World,
} from "./types";
import { machineOf } from "./world/access";
import { timeAt } from "./world/clock";

function runProgram(
  world: World,
  machine: Machine,
  argv: readonly string[],
  time: number,
  answer?: string,
): Dispatched {
  const [program, ...args] = argv;
  if (program === undefined) return { command: "", counted: false };
  if (program === "git")
    return dispatchGit(world, machine, args, time, GIT_REGISTRY, answer);
  const shell = SHELL_REGISTRY.get(program);
  const result: CommandResult = shell
    ? shell.run({
        world,
        machine,
        args,
        time,
        ...(answer === undefined ? {} : { answer }),
      })
    : shellFail(shellMessages.notFound(program), 127);
  return { ...result, command: program, counted: false };
}

function toOutcome(result: Dispatched, world: World): Outcome {
  return {
    world: result.world ?? world,
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

/** Runs one simple command or Hub action. Pure: the input world is never changed. */
export function execute(
  world: World,
  invocation: Invocation | HubInvocation,
): Outcome {
  if ("kind" in invocation) return act(world, invocation);
  const time = timeAt(world.seq);
  let current: World = { ...world, seq: world.seq + 1, pending: undefined };
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
  const outcome = toOutcome(result, current);
  if (outcome.request?.kind !== "editor") return outcome;
  const pending = {
    request: outcome.request,
    argv,
    machine: machine.id,
    cwd: machine.cwd,
    time,
  };
  return { ...outcome, world: { ...outcome.world, pending } };
}

/**
 * Answers the editor the last command is waiting for (null = closed
 * without saving) by re-running that command with the text; the clock
 * does not tick, as the editor belongs to the same command.
 */
export function resume(world: World, answer: string | null): Outcome {
  const { pending } = world;
  invariant(pending, "No command is waiting for an editor");
  const rest: World = { ...world, pending: undefined };
  const command = pending.argv[0] ?? "";
  if (answer === null && pending.request.purpose === "file") {
    return toOutcome({ command, counted: false }, rest);
  }
  const result = runProgram(
    rest,
    machineOf(rest, pending.machine),
    pending.argv,
    pending.time,
    answer ?? pending.request.initial,
  );
  return toOutcome(result, rest);
}

/** One history entry for a command and its resumed editor. */
export function mergeOutcomes(first: Outcome, second: Outcome): Outcome {
  return {
    world: second.world,
    output: {
      stdout: first.output.stdout + second.output.stdout,
      stderr: first.output.stderr + second.output.stderr,
      exitCode: second.output.exitCode,
    },
    effects: [...first.effects, ...second.effects],
    ...(second.request ? { request: second.request } : {}),
    notes: [...first.notes, ...second.notes],
    meta: { ...first.meta, ...second.meta },
  };
}
