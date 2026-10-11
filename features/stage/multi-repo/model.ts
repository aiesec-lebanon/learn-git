import {
  hubName,
  type Oid,
  type Repo,
  type RepoId,
  type World,
} from "@/engine";
import { repoView, type RepoView } from "@/features/graph/view-model";

/** Another repository on the stage: the Hub's copy or a teammate's clone. */
export type RepoPanel = {
  readonly id: RepoId;
  readonly role: "remote" | "teammate";
  /** `origin`, `Sam's clone`. */
  readonly title: string;
  /** `hub.test/sam/team`, `~sam/team`. */
  readonly where: string;
  readonly view: RepoView;
  /** Prefix for this panel's choreography keys (one graph per repository). */
  readonly scope: string;
  /** Commits here that your repository does not have yet, oldest first. */
  readonly onlyHere: readonly PanelCommit[];
};

export type PanelCommit = {
  readonly oid: Oid;
  readonly short: string;
  readonly subject: string;
};

const capitalized = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** Hub repositories a repository's remotes point at, by URL. */
function remotesOf(repo: Repo): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of repo.config) {
    const match = /^remote\.(.+)\.url$/.exec(e.key);
    const name = match?.[1];
    const hosted = e.value ? hubName(e.value) : null;
    if (name && hosted && !out.has(hosted)) out.set(hosted, name);
  }
  return out;
}

const fullNameOf = (repo: Repo) => repo.workdir.slice(1).replace(/\.git$/, "");

/** The person a machine belongs to, as the actor schedule names them. */
function ownerName(world: World, machine: string): string {
  const named = world.actors?.scripts.find((s) => s.machine === machine);
  return named?.name ?? capitalized(machine);
}

/**
 * The other repositories the stage shows next to `main`: every Hub
 * repository (named as `main` calls it, e.g. `origin`) and every
 * teammate clone of one, Hub first. Empty in a world without a Hub.
 */
export function repoPanels(world: World, main: RepoId | null): RepoPanel[] {
  const hosted = [...world.repos.values()].filter((r) => r.bare);
  if (!hosted.length) return [];
  const mine = main ? (world.repos.get(main) as Repo) : null;
  const names = mine ? remotesOf(mine) : new Map();
  const have = new Set(mine?.arrival);
  const shared = new Set(hosted.map(fullNameOf));
  const panels: RepoPanel[] = hosted.map((repo) => {
    const fullName = fullNameOf(repo);
    const view = repoView(world, repo);
    return {
      id: repo.id,
      role: "remote",
      title: names.get(fullName) ?? "The Hub",
      where: `hub.test/${fullName}`,
      view,
      scope: `${repo.id}|`,
      onlyHere: mine
        ? view.commits
            .filter((c) => c.ghost === 0 && !have.has(c.oid))
            .map(({ oid, short, subject }) => ({ oid, short, subject }))
        : [],
    };
  });
  for (const repo of world.repos.values()) {
    if (repo.bare || repo.id === main || repo.machine === "you") continue;
    const linked = [...remotesOf(repo).keys()].some((n) => shared.has(n));
    if (!linked) continue;
    const owner = ownerName(world, repo.machine);
    const home = `/home/${repo.machine}/`;
    panels.push({
      id: repo.id,
      role: "teammate",
      title: `${owner}'s clone`,
      where: repo.workdir.startsWith(home)
        ? `~${repo.machine}/${repo.workdir.slice(home.length)}`
        : repo.workdir,
      view: repoView(world, repo),
      scope: `${repo.id}|`,
      onlyHere: [],
    });
  }
  return panels;
}
