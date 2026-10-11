import type {
  HostedRepo,
  HostedRepoSpec,
  HubState,
  RepoId,
  World,
} from "../types";
import { LEARNER } from "../world/defaults";
import { HUB_MACHINE, hostedRepoId, hostRepo } from "../world/network";

/** The Hub with its hosted repositories (empty, default branch `main`) and accounts. */
export function createHub(
  world: World,
  specs: Readonly<Record<string, HostedRepoSpec>>,
): World {
  const names = Object.keys(specs);
  if (!names.length) return world;
  const machines = new Map(world.machines).set(HUB_MACHINE.id, HUB_MACHINE);
  let next: World = { ...world, machines };
  const repos = new Map<string, HostedRepo>();
  for (const fullName of names) {
    next = hostRepo(next, fullName);
    const [owner = ""] = fullName.split("/");
    repos.set(fullName, {
      fullName,
      owner,
      repo: hostedRepoId(fullName),
      rules: specs[fullName]?.rules ?? [],
    });
  }
  const owners = [...repos.values()].map((r) => r.owner);
  const hub: HubState = {
    accounts: [...new Set([LEARNER, ...owners])],
    repos,
  };
  return { ...next, hub };
}

/** The hosted repository a bare repository backs, if the Hub hosts it. */
export function hostedBy(world: World, repo: RepoId): HostedRepo | null {
  for (const hosted of world.hub?.repos.values() ?? []) {
    if (hosted.repo === repo) return hosted;
  }
  return null;
}
