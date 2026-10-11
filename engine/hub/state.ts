import { invariant } from "../errors";
import type {
  BranchRule,
  HostedRepo,
  HostedRepoSpec,
  HubState,
  RepoId,
  World,
} from "../types";
import { withEntry } from "../util/cow";
import { LEARNER } from "../world/defaults";
import { HUB, HUB_MACHINE, hostedRepoId, hostRepo } from "../world/network";

/** The world with the Hub machine and state, created on first use. */
export function ensureHub(world: World): World {
  if (world.hub) return world;
  const machines = new Map(world.machines).set(HUB, HUB_MACHINE);
  const accounts = [LEARNER, ...world.machines.keys()];
  const hub: HubState = { accounts: [...new Set(accounts)], repos: new Map() };
  return { ...world, machines, hub };
}

/** Hosts a new empty repository `<owner>/<name>` (default branch `main`). */
export function addHostedRepo(
  world: World,
  fullName: string,
  rules: readonly BranchRule[] = [],
): World {
  const next = hostRepo(ensureHub(world), fullName);
  const hub = next.hub as HubState;
  const [owner = ""] = fullName.split("/");
  const hosted: HostedRepo = {
    fullName,
    owner,
    repo: hostedRepoId(fullName),
    rules,
    pulls: [],
    issues: [],
  };
  return {
    ...next,
    hub: {
      accounts: hub.accounts.includes(owner)
        ? hub.accounts
        : [...hub.accounts, owner],
      repos: withEntry(hub.repos, fullName, hosted),
    },
  };
}

/** The Hub with its hosted repositories (empty, default branch `main`) and accounts. */
export function createHub(
  world: World,
  specs: Readonly<Record<string, HostedRepoSpec>>,
): World {
  return Object.entries(specs).reduce(
    (next, [fullName, spec]) => addHostedRepo(next, fullName, spec.rules),
    world,
  );
}

/** The hosted repository a bare repository backs, if the Hub hosts it. */
export function hostedBy(world: World, repo: RepoId): HostedRepo | null {
  for (const hosted of world.hub?.repos.values() ?? []) {
    if (hosted.repo === repo) return hosted;
  }
  return null;
}

/** The hosted repository `<owner>/<name>` (content and UI only ask for existing ones). */
export function hostedRepo(world: World, fullName: string): HostedRepo {
  const hosted = world.hub?.repos.get(fullName);
  invariant(hosted, `The Hub hosts no ${fullName}`);
  return hosted;
}

/** Replaces one hosted repository's Hub state. */
export function withHosted(world: World, hosted: HostedRepo): World {
  const hub = world.hub as HubState;
  return {
    ...world,
    hub: { ...hub, repos: withEntry(hub.repos, hosted.fullName, hosted) },
  };
}

/** The number the next pull request or issue in a repository gets. */
export const nextNumber = (hosted: HostedRepo) =>
  hosted.pulls.length + hosted.issues.length + 1;
