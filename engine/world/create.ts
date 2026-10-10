import { canonicalKey } from "../config/keys";
import { EngineInvariantError } from "../errors";
import { ancestors, resolvePath } from "../files/paths";
import { runLine } from "../run";
import type { ConfigFile, Machine, World, WorldSpec } from "../types";
import { DEFAULT_GLOBAL_CONFIG, HOME, LEARNER } from "./defaults";

function configFrom(entries: Readonly<Record<string, string>>): ConfigFile {
  return Object.entries(entries).map(([key, value]) => {
    const canonical = canonicalKey(key);
    if (!canonical) throw new EngineInvariantError(`Invalid config key ${key}`);
    return { key: canonical, value };
  });
}

/** A fresh, deterministic world: the learner's machine with files and config, then the setup commands. */
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
  const world: World = {
    seq: 0,
    objects: new Map(),
    system: configFrom(spec.system ?? {}),
    machines: new Map([[machine.id, machine]]),
    repos: new Map(),
  };
  return (spec.setup ?? []).reduce(setUp, world);
}

function setUp(world: World, line: string): World {
  const ran = runLine(world, line);
  if (ran.outcomes.some((o) => o.output.exitCode !== 0 || o.request))
    throw new EngineInvariantError(`Setup failed: ${line}`);
  return ran.world;
}
