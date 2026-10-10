import type { CommandResult } from "../commands/registry";
import { relativeTo, resolvePath } from "../files/paths";
import { isGitPath } from "../files/worktree";
import { LIMITS } from "../limits";
import { notSimulated } from "../messages/git";
import type { Effect, Fs, Machine, PathChange, World } from "../types";
import { withMachine } from "../world/access";

export type ShellContext = {
  readonly world: World;
  readonly machine: Machine;
  readonly args: readonly string[];
  readonly time: number;
};

export type ShellCommand = {
  readonly name: string;
  readonly run: (ctx: ShellContext) => CommandResult;
};

export const defineShell = (command: ShellCommand) => command;

export function createShellRegistry(
  commands: readonly ShellCommand[],
): ReadonlyMap<string, ShellCommand> {
  return new Map(commands.map((c) => [c.name, c]));
}

export function shellFail(stderr: string, exitCode = 1): CommandResult {
  return {
    stderr,
    exitCode,
    effects: [{ kind: "refused", code: "shell-error" }],
  };
}

export function unsimulated(what: string): CommandResult {
  return {
    stderr: notSimulated(what),
    exitCode: 1,
    effects: [{ kind: "refused", code: "not-simulated" }],
  };
}

/** Leading `-xyz` bundles become flags; anything not in `allowed` is unsimulated. */
export function parseFlags(
  args: readonly string[],
  allowed: string,
):
  { flags: ReadonlySet<string>; operands: string[] } | { unsupported: string } {
  const flags = new Set<string>();
  const operands: string[] = [];
  let options = true;
  for (const arg of args) {
    if (options && arg === "--") options = false;
    else if (options && arg.length > 1 && arg.startsWith("-")) {
      for (const letter of arg.slice(1)) {
        if (!allowed.includes(letter)) return { unsupported: arg };
        flags.add(letter);
      }
    } else operands.push(arg);
  }
  return { flags, operands };
}

/** Why the sandbox shell will not write `path`, or null when it can. */
export function writeGuard(path: string): string | null {
  if (isGitPath(path)) return "files inside .git (Git's own storage)";
  const depth = (relativeTo("/", path) ?? "").split("/").length;
  return depth > LIMITS.pathDepth
    ? `paths deeper than ${LIMITS.pathDepth} folders`
    : null;
}

/** Like `writeGuard`, and a repository's folder (or one holding it) stays put. */
export function removeGuard(
  world: World,
  machine: Machine,
  path: string,
): string | null {
  for (const repo of world.repos.values()) {
    if (
      repo.machine === machine.id &&
      relativeTo(path, repo.workdir) !== null
    ) {
      return "moving or deleting a repository's folder";
    }
  }
  return relativeTo(path, machine.cwd) !== null
    ? "removing the current folder or one above it"
    : writeGuard(path);
}

export function capsGuard(fs: Fs, content = ""): string | null {
  if (fs.files.size > LIMITS.files) return `more than ${LIMITS.files} files`;
  if (content.length > LIMITS.fileChars) {
    return `files larger than ${LIMITS.fileChars} characters`;
  }
  return null;
}

export const resolveFor = (machine: Machine, path: string) =>
  resolvePath(machine.cwd, path);

/** Commits a filesystem change for the machine with one `files-changed` effect. */
export function changeFs(
  ctx: ShellContext,
  fs: Fs,
  changes: readonly (PathChange & { node: "file" | "dir" })[],
  extra: CommandResult = {},
): CommandResult {
  const effects: Effect[] = changes.length
    ? [{ kind: "files-changed", machine: ctx.machine.id, changes }]
    : [];
  return {
    ...extra,
    world: withMachine(ctx.world, { ...ctx.machine, fs }),
    effects: [...effects, ...(extra.effects ?? [])],
  };
}
