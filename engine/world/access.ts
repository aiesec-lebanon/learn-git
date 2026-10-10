import { invariant } from "../errors";
import type { Machine, MachineId, Repo, RepoId, World } from "../types";
import { withEntry } from "../util/cow";
import { LEARNER } from "./defaults";

export function machineOf(world: World, id: MachineId = LEARNER): Machine {
  const machine = world.machines.get(id);
  invariant(machine, `Unknown machine ${id}`);
  return machine;
}

export function repoOf(world: World, id: RepoId): Repo {
  const repo = world.repos.get(id);
  invariant(repo, `Unknown repository ${id}`);
  return repo;
}

export function withMachine(world: World, machine: Machine): World {
  return { ...world, machines: withEntry(world.machines, machine.id, machine) };
}

export function withRepo(world: World, repo: Repo): World {
  return { ...world, repos: withEntry(world.repos, repo.id, repo) };
}

export function repoIdFor(machine: MachineId, workdir: string): RepoId {
  return `${machine}:${workdir}`;
}
