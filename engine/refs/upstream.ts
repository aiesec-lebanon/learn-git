import { configValue } from "../config/scopes";
import type { Machine, RefName, Repo, World } from "../types";

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
