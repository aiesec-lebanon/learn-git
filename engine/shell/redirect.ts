import type { CommandResult } from "../commands/registry";
import { parentOf } from "../files/paths";
import { writeFile } from "../files/worktree";
import { shellMessages } from "../messages/shell";
import type { Effect, Machine, Redirect, World } from "../types";
import { machineOf, withMachine } from "../world/access";
import {
  capsGuard,
  resolveFor,
  shellFail,
  unsimulated,
  writeGuard,
} from "./registry";

type Opened = {
  readonly world: World;
  readonly path: string;
  readonly existed: boolean;
};

/** Opens `> file` or `>> file` before the command runs, as bash does. */
export function openRedirect(
  world: World,
  machine: Machine,
  redirect: Redirect,
): Opened | { readonly error: CommandResult } {
  const target = redirect.target.text;
  const path = resolveFor(machine, target);
  const guard = writeGuard(path);
  if (guard) return { error: unsimulated(guard) };
  if (machine.fs.dirs.has(path))
    return { error: shellFail(shellMessages.redirectIsDir(target)) };
  if (!machine.fs.dirs.has(parentOf(path))) {
    return { error: shellFail(shellMessages.redirectMissing(target)) };
  }
  const existing = machine.fs.files.get(path);
  const content = redirect.op === ">>" ? (existing ?? "") : "";
  const fs = writeFile(machine.fs, path, content);
  return {
    world: withMachine(world, { ...machine, fs }),
    path,
    existed: existing !== undefined,
  };
}

/** Appends the command's stdout to the opened file and reports the change. */
export function closeRedirect(
  opened: Opened,
  original: Machine,
  result: CommandResult,
): CommandResult {
  const world = result.world ?? opened.world;
  const machine = machineOf(world, original.id);
  const current = machine.fs.files.get(opened.path);
  if (current === undefined) return { ...result, stdout: "" };
  const content = current + (result.stdout ?? "");
  const fs = writeFile(machine.fs, opened.path, content);
  const cap = capsGuard(fs, content);
  if (cap) return unsimulated(cap);
  const effects: Effect[] = [...(result.effects ?? [])];
  if (!opened.existed || original.fs.files.get(opened.path) !== content) {
    effects.push({
      kind: "files-changed",
      machine: original.id,
      changes: [
        {
          path: opened.path,
          change: opened.existed ? "modified" : "added",
          node: "file",
        },
      ],
    });
  }
  return {
    ...result,
    stdout: "",
    world: withMachine(world, { ...machine, fs }),
    effects,
  };
}
