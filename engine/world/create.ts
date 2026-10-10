import { canonicalKey } from "../config/keys";
import { EngineInvariantError } from "../errors";
import { ancestors, resolvePath } from "../files/paths";
import type { ConfigFile, Machine, World, WorldSpec } from "../types";
import { DEFAULT_GLOBAL_CONFIG, HOME, LEARNER } from "./defaults";

function configFrom(entries: Readonly<Record<string, string>>): ConfigFile {
  return Object.entries(entries).map(([key, value]) => {
    const canonical = canonicalKey(key);
    if (!canonical) throw new EngineInvariantError(`Invalid config key ${key}`);
    return { key: canonical, value };
  });
}

/** A fresh, deterministic world: the learner's machine with files and config, no repositories. */
export function createWorld(spec: WorldSpec = {}): World {
  const files = new Map<string, string>();
  const dirs = new Set<string>([...ancestors(HOME), HOME]);
  const addDir = (dir: string) => {
    for (const a of ancestors(dir)) dirs.add(a);
    dirs.add(dir);
  };
  for (const dir of spec.dirs ?? []) addDir(resolvePath(HOME, dir));
  for (const [rel, content] of Object.entries(spec.files ?? {})) {
    const path = resolvePath(HOME, rel);
    for (const a of ancestors(path)) dirs.add(a);
    files.set(path, content);
  }
  const cwd = resolvePath(HOME, spec.cwd ?? "");
  const global = configFrom(spec.global ?? DEFAULT_GLOBAL_CONFIG);
  addDir(cwd);
  const machine: Machine = {
    id: LEARNER,
    home: HOME,
    cwd,
    fs: { files, dirs },
    config: global.length ? global : null,
  };
  return {
    seq: 0,
    objects: new Map(),
    system: configFrom(spec.system ?? {}),
    machines: new Map([[machine.id, machine]]),
    repos: new Map(),
  };
}
