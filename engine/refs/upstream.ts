import { remoteNames } from "../config/remotes";
import { configValue } from "../config/scopes";
import type { ConfigFile, Machine, Oid, RefName, Repo, World } from "../types";

/**
 * The ref a branch's upstream config names (`branch.<name>.remote` and
 * `.merge`), as the default fetch refspec maps it; null when unset.
 */
export function upstreamOf(
  world: World,
  machine: Machine,
  repo: Repo,
  branch: string,
): RefName | null {
  const remote = configValue(world, machine, repo, `branch.${branch}.remote`);
  const merge = configValue(world, machine, repo, `branch.${branch}.merge`);
  if (!remote || !merge) return null;
  if (remote === ".") return merge as RefName;
  const name = merge.replace(/^refs\/heads\//, "");
  return `refs/remotes/${remote}/${name}` as RefName;
}

/** The upstream a new branch gets: its remote, the remote's branch and the tracking ref. */
export type TrackSetup = {
  readonly remote: string;
  readonly merge: RefName;
  readonly ref: RefName;
};

/**
 * `git switch <name>`'s guess: the one remote-tracking branch named
 * `<remote>/<name>`, or null when none or several exist.
 */
export function guessRemoteBranch(
  repo: Repo,
  name: string,
): (TrackSetup & { readonly oid: Oid }) | null {
  const found = remoteNames(repo).flatMap((remote) => {
    const ref = `refs/remotes/${remote}/${name}` as RefName;
    const oid = repo.refs.get(ref);
    return oid
      ? [{ remote, merge: `refs/heads/${name}` as RefName, ref, oid }]
      : [];
  });
  return found.length === 1 ? (found[0] ?? null) : null;
}

/** The two keys that link `branch` to its upstream. */
export function upstreamConfig(branch: string, setup: TrackSetup): ConfigFile {
  return [
    { key: `branch.${branch}.remote`, value: setup.remote },
    { key: `branch.${branch}.merge`, value: setup.merge },
  ];
}
