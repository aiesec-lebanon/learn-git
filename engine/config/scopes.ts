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
