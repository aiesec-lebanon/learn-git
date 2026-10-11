import { invariant } from "../errors";
import { networkMessages as net } from "../messages/remote";
import { makeAvailable } from "../objects/write";
import { branchRef } from "../refs/names";
import type {
  ConfigFile,
  Effect,
  Machine,
  ObjectPool,
  Oid,
  Repo,
  RepoId,
  World,
} from "../types";
import { repoIdFor, repoOf, withRepo } from "./access";

/** The machine that hosts the Hub's bare repositories. */
export const HUB = "hub";
export const HUB_ORIGIN = "https://hub.test/";

const HUB_URL = /^https:\/\/hub\.test\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

/** `<owner>/<name>` for a Hub URL (`.git` and a final `/` optional), else null. */
export function hubName(url: string): string | null {
  const match = HUB_URL.exec(url);
  return match ? `${match[1]}/${match[2]}` : null;
}

export const hostedRepoId = (fullName: string): RepoId =>
  repoIdFor(HUB, `/${fullName}.git`);

/** The repository a remote URL reaches through the simulated network, or null. */
export function resolveUrl(world: World, url: string): Repo | null {
  const name = hubName(url);
  return (name && world.repos.get(hostedRepoId(name))) || null;
}

/**
 * Connects to a remote: the repository, or Git's failure for that kind of
 * address (`name` is what the learner typed, a remote name or the URL).
 */
export function connect(
  world: World,
  url: string,
  name: string = url,
): { ok: true; repo: Repo } | { ok: false; stderr: string } {
  const repo = resolveUrl(world, url);
  if (repo) return { ok: true, repo };
  if (hubName(url)) return { ok: false, stderr: net.notFound(url) };
  const host = /^https?:\/\/([^/]+)/.exec(url)?.[1];
  return host
    ? { ok: false, stderr: net.noHost(url, host) }
    : { ok: false, stderr: net.notARepository(name) };
}

export const HUB_MACHINE: Machine = {
  id: HUB,
  home: "/",
  cwd: "/",
  fs: { files: new Map(), dirs: new Set(["/"]) },
  config: null,
};

/** What Git for Windows writes into a new bare repository's `config`. */
const BARE_CONFIG: ConfigFile = [
  { key: "core.repositoryformatversion", value: "0" },
  { key: "core.filemode", value: "false" },
  { key: "core.bare", value: "true" },
  { key: "core.symlinks", value: "false" },
  { key: "core.ignorecase", value: "true" },
];

/** An empty bare repository on the Hub whose default branch is `main`. */
export function hostRepo(world: World, fullName: string): World {
  invariant(world.machines.has(HUB), "The world has no Hub");
  const id = hostedRepoId(fullName);
  invariant(!world.repos.has(id), `Repository ${fullName} exists`);
  return withRepo(world, {
    id,
    machine: HUB,
    workdir: `/${fullName}.git`,
    head: { kind: "symbolic", ref: branchRef("main") },
    refs: new Map(),
    reflogs: new Map(),
    index: new Map(),
    config: BARE_CONFIG,
    arrival: [],
    bare: true,
  });
}

/**
 * Objects reachable from `tips` that `have` lacks (a repository that has a
 * commit has its whole history), and the missing commits among them.
 */
export function missingObjects(
  pool: ObjectPool,
  have: ReadonlySet<Oid>,
  tips: readonly Oid[],
): { commits: Oid[]; all: Oid[] } {
  const all = new Set<Oid>();
  const commits: Oid[] = [];
  const addTree = (oid: Oid) => {
    if (have.has(oid) || all.has(oid)) return;
    all.add(oid);
    const tree = pool.get(oid);
    if (tree?.type !== "tree") return;
    for (const entry of tree.entries) addTree(entry.oid);
  };
  const stack = [...tips];
  while (stack.length) {
    const oid = stack.pop() as Oid;
    if (have.has(oid) || all.has(oid)) continue;
    const commit = pool.get(oid);
    invariant(commit?.type === "commit", `Expected commit ${oid}`);
    all.add(oid);
    commits.push(oid);
    addTree(commit.tree);
    stack.push(...commit.parents);
  }
  return { commits, all: [...all] };
}

/** Parents before children, in the source's arrival order where it has one. */
function arrivalOrder(
  pool: ObjectPool,
  commits: readonly Oid[],
  source: readonly Oid[],
): Oid[] {
  const rank = new Map(source.map((oid, i) => [oid, i]));
  const wanted = new Set(commits);
  const sorted = [...commits].sort(
    (a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity),
  );
  const out: Oid[] = [];
  const placed = new Set<Oid>();
  const place = (oid: Oid) => {
    if (placed.has(oid) || !wanted.has(oid)) return;
    placed.add(oid);
    const commit = pool.get(oid);
    if (commit?.type === "commit") commit.parents.forEach(place);
    out.push(oid);
  };
  sorted.forEach(place);
  return out;
}

/**
 * Copies what `to` lacks of the history behind `tips` from `from`: the
 * objects become available in `to` and its new commits arrive in order.
 */
export function transfer(
  world: World,
  from: RepoId,
  to: RepoId,
  tips: readonly Oid[],
  direction: "fetch" | "push",
): { world: World; effects: Effect[] } {
  const have = world.available.get(to) ?? new Set<Oid>();
  const missing = missingObjects(world.objects, have, tips);
  if (!missing.all.length) return { world, effects: [] };
  const made = makeAvailable(world, to, missing.all);
  const target = repoOf(made.world, to);
  const arrived = arrivalOrder(
    world.objects,
    missing.commits,
    repoOf(world, from).arrival,
  );
  return {
    world: withRepo(made.world, {
      ...target,
      arrival: [...target.arrival, ...arrived],
    }),
    effects: [{ kind: "transfer", from, to, oids: missing.all, direction }],
  };
}
