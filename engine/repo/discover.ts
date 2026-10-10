import { relativeTo } from "../files/paths";
import type { Machine, Repo, World } from "../types";

/** The repository whose worktree contains `cwd` (the nearest one), as Git discovers it. */
export function discoverRepo(
  world: World,
  machine: Machine,
  cwd: string = machine.cwd,
): Repo | null {
  let found: Repo | null = null;
  for (const repo of world.repos.values()) {
    if (repo.machine !== machine.id) continue;
    if (relativeTo(repo.workdir, cwd) === null) continue;
    if (!found || repo.workdir.length > found.workdir.length) found = repo;
  }
  return found;
}
