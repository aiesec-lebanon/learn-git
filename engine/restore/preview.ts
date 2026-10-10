import { isGitPath } from "../files/worktree";
import { hashObject } from "../objects/hash";
import type { MachineId, World } from "../types";
import { machineOf } from "../world/access";

export type Overwrite = {
  /** Absolute path of a file the command replaces or deletes. */
  readonly path: string;
  /** True when its current content is stored nowhere in Git: gone for good. */
  readonly lost: boolean;
};

/**
 * Which files a command would overwrite, comparing the world before it
 * with the world a `Session.preview` returned (the destructive-command
 * preview of `restore` and its legacy forms).
 */
export function overwrites(
  before: World,
  after: World,
  machine?: MachineId,
): Overwrite[] {
  const was = machineOf(before, machine).fs.files;
  const now = machineOf(after, machine).fs.files;
  const out: Overwrite[] = [];
  for (const [path, content] of was) {
    if (isGitPath(path) || now.get(path) === content) continue;
    const oid = hashObject({ type: "blob", content });
    out.push({ path, lost: !before.objects.has(oid) });
  }
  return out;
}
