import {
  abbreviate,
  hubCommits,
  pullCompare,
  type Oid,
  type PullRequest,
  type Repo,
  type World,
} from "@/engine";
import { originOnHub } from "./hub-split.model";

/** One commit of a pull request and the repositories that hold it. */
export type PlacedCommit = {
  readonly oid: Oid;
  readonly short: string;
  readonly subject: string;
  readonly local: boolean;
  readonly origin: boolean;
};

export type PullSync = {
  readonly repo: string;
  readonly pull: Pick<
    PullRequest,
    "number" | "title" | "state" | "head" | "base"
  > | null;
  /** The pull request's commits, newest first, its merge commit on top once merged. */
  readonly commits: readonly PlacedCommit[];
};

/** Origin's newest pull request, each of its commits placed in your repository and on origin. */
export function pullSync(world: World, repo: Repo): PullSync | null {
  const name = originOnHub(world, repo);
  const hosted = name ? world.hub?.repos.get(name) : undefined;
  if (!name || !hosted) return null;
  const pull = hosted.pulls.at(-1);
  if (!pull) return { repo: name, pull: null, commits: [] };
  const proposed = pullCompare(world, name, pull)?.commits ?? [];
  const oids = [
    ...(pull.merged ? [pull.merged.commit] : []),
    ...proposed.map((c) => c.oid).reverse(),
  ];
  const mine = new Set(repo.arrival);
  const theirs = new Set(world.repos.get(hosted.repo)?.arrival);
  const { number, title, state, head, base } = pull;
  return {
    repo: name,
    pull: { number, title, state, head, base },
    commits: oids.map((oid) => ({
      oid,
      short: abbreviate(world.objects, oid),
      subject: hubCommits(world, name, oid)[0]?.subject ?? "",
      local: mine.has(oid),
      origin: theirs.has(oid),
    })),
  };
}
