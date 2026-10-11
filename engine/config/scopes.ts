import type {
  ConfigEntry,
  ConfigFile,
  ConfigScope,
  Effect,
  Machine,
  Repo,
  World,
} from "../types";
import { withMachine, withRepo } from "../world/access";

export type ScopedEntry = ConfigEntry & { readonly scope: ConfigScope };

/** Entries in the order Git reads them: system, global, then local. */
export function scopedEntries(
  world: World,
  machine: Machine,
  repo: Repo | null,
  only?: ConfigScope,
): ScopedEntry[] {
  const files: [ConfigScope, ConfigFile][] = [
    ["system", world.system],
    ["global", machine.config ?? []],
    ["local", repo?.config ?? []],
  ];
  return files
    .filter(([scope]) => !only || scope === only)
    .flatMap(([scope, file]) => file.map((e) => ({ ...e, scope })));
}

/** The value Git uses: the last occurrence across the scopes read. */
export function configValue(
  world: World,
  machine: Machine,
  repo: Repo | null,
  key: string,
  only?: ConfigScope,
): string | null | undefined {
  const found = scopedEntries(world, machine, repo, only).filter(
    (e) => e.key === key,
  );
  return found.at(-1)?.value;
}

/** Replaces the last occurrence of `key` in place, or appends it. */
export function setEntry(
  file: ConfigFile,
  key: string,
  value: string,
): ConfigFile {
  const at = file.map((e) => e.key).lastIndexOf(key);
  if (at < 0) return [...file, { key, value }];
  return file.map((e, i) => (i === at ? { key, value } : e));
}

/** Removes `key`; null when the file has no such key. */
export function unsetEntry(file: ConfigFile, key: string): ConfigFile | null {
  const next = file.filter((e) => e.key !== key);
  return next.length === file.length ? null : next;
}

/** Writes one scope's file back into the world, with a `config-changed` effect. */
export function writeScope(
  world: World,
  machine: Machine,
  repo: Repo | null,
  scope: "global" | "local",
  file: ConfigFile,
  change: { key: string; from: string | null; to: string | null },
): { world: World; effect: Effect } {
  if (scope === "local" && repo) {
    return {
      world: withRepo(world, { ...repo, config: file }),
      effect: { kind: "config-changed", scope, target: repo.id, ...change },
    };
  }
  return {
    world: withMachine(world, { ...machine, config: file }),
    effect: { kind: "config-changed", scope, target: machine.id, ...change },
  };
}

/**
 * Renames (or with `to` null removes) a config section such as
 * `branch.topic`, with one `config-changed` effect per key whose value changes.
 */
export function moveSection(
  repo: Repo,
  from: string,
  to: string | null,
): { repo: Repo; effects: Effect[] } {
  const prefix = `${from}.`;
  const inSection = (e: ConfigEntry) => e.key.startsWith(prefix);
  const moved = repo.config.filter(inSection);
  if (!moved.length) return { repo, effects: [] };
  const config: ConfigFile =
    to === null
      ? repo.config.filter((e) => !inSection(e))
      : repo.config.map((e) =>
          inSection(e)
            ? { ...e, key: `${to}.${e.key.slice(prefix.length)}` }
            : e,
        );
  const last = (file: ConfigFile, key: string) =>
    file.filter((e) => e.key === key).at(-1)?.value ?? null;
  const keys = new Set([...repo.config, ...config].map((e) => e.key));
  const effects: Effect[] = [...keys].flatMap((key) => {
    const before = last(repo.config, key);
    const after = last(config, key);
    return before === after
      ? []
      : [
          {
            kind: "config-changed" as const,
            scope: "local" as const,
            target: repo.id,
            key,
            from: before,
            to: after,
          },
        ];
  });
  return { repo: { ...repo, config }, effects };
}
