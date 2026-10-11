import {
  abbreviate,
  createWorld,
  hubBranches,
  hubCommits,
  hubName,
  Session,
  type Oid,
  type Repo,
  type World,
} from "@/engine";
import { repoView, type RepoView } from "@/features/graph/view-model";
import { recipeSiteHistory } from "@/content/worlds/recipe-site";

export type HubSideCommit = {
  readonly oid: Oid;
  readonly short: string;
  readonly subject: string;
  /** Also in your repository. */
  readonly local: boolean;
};

export type HubSide = {
  readonly repo: string;
  readonly branch: string;
  readonly commits: readonly HubSideCommit[];
};

/** The Hub repository your `origin` points at, if it exists. */
export function originOnHub(world: World, repo: Repo): string | null {
  const url = repo.config.findLast((e) => e.key === "remote.origin.url")?.value;
  const name = url ? hubName(url) : null;
  return name && world.hub?.repos.has(name) ? name : null;
}

/** Origin's default branch as its repository page lists it, each commit marked if you have it too. */
export function hubSide(world: World, repo: Repo): HubSide | null {
  const name = originOnHub(world, repo);
  const branch = name
    ? hubBranches(world, name).find((b) => b.isDefault)
    : undefined;
  if (!name || !branch) return null;
  const mine = new Set(repo.arrival);
  return {
    repo: name,
    branch: branch.name,
    commits: hubCommits(world, name, branch.oid).map((c) => ({
      oid: c.oid,
      short: abbreviate(world.objects, c.oid),
      subject: c.subject,
      local: mine.has(c.oid),
    })),
  };
}

/** Your three commits beside a README commit fetched from a Hub repository: two roots (B6.1). */
export function twoRootsView(): RepoView {
  const session = new Session(createWorld({ ...recipeSiteHistory, hub: {} }));
  session.act({
    type: "create-repository",
    name: "recipes-draft",
    readme: true,
  });
  session.run("git remote add draft https://hub.test/you/recipes-draft.git");
  session.run("git fetch draft");
  const { world } = session.getSnapshot();
  const repo = [...world.repos.values()].find((r) => r.machine === "you");
  if (!repo) throw new Error("no repository");
  return repoView(world, repo);
}
