import { isValidRefName } from "../refs/names";
import type { ConfigFile, Machine, Repo, World } from "../types";
import { configValue } from "./scopes";

/** Remote names in the order their sections first appear in the local config. */
export function remoteNames(repo: Repo): string[] {
  const names = repo.config.flatMap((e) => {
    const match = /^remote\.(.+)\.url$/.exec(e.key);
    return match?.[1] ? [match[1]] : [];
  });
  return [...new Set(names)];
}

export function remoteUrl(
  world: World,
  machine: Machine,
  repo: Repo,
  name: string,
): string | null {
  return configValue(world, machine, repo, `remote.${name}.url`) ?? null;
}

/** Git accepts a remote name when `refs/remotes/<name>/test` is a valid ref. */
export const isValidRemoteName = (name: string) =>
  isValidRefName(`refs/remotes/${name}/test`);

/** The two keys `remote add` and `clone` write for a remote. */
export function remoteSection(name: string, url: string): ConfigFile {
  return [
    { key: `remote.${name}.url`, value: url },
    {
      key: `remote.${name}.fetch`,
      value: `+refs/heads/*:refs/remotes/${name}/*`,
    },
  ];
}
