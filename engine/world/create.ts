import { canonicalKey } from "../config/keys";
import { EngineInvariantError } from "../errors";
import { ancestors, resolvePath } from "../files/paths";
import { runLine } from "../run";
import type {
  ConfigFile,
  Machine,
  MachineId,
  MachineSpec,
  SetupStep,
  World,
  WorldSpec,
} from "../types";
import { DEFAULT_GLOBAL_CONFIG, HOME, LEARNER } from "./defaults";
import { act } from "../hub/actions";
import { applyRules, createHub } from "../hub/state";
import { withActors } from "./actors";

function configFrom(entries: Readonly<Record<string, string>>): ConfigFile {
  return Object.entries(entries).map(([key, value]) => {
    const canonical = canonicalKey(key);
    if (!canonical) throw new EngineInvariantError(`Invalid config key ${key}`);
    return { key: canonical, value };
  });
}

/** A machine whose home holds the spec's files and folders. */
function createMachine(
  id: MachineId,
  home: string,
  spec: MachineSpec,
): Machine {
  const files = new Map<string, string>();
  const dirs = new Set<string>([...ancestors(home), home]);
  const addDir = (dir: string) => {
    for (const a of ancestors(dir)) dirs.add(a);
    dirs.add(dir);
  };
  for (const dir of spec.dirs ?? []) addDir(resolvePath(home, dir));
  for (const [rel, content] of Object.entries(spec.files ?? {})) {
    const path = resolvePath(home, rel);
    for (const a of ancestors(path)) dirs.add(a);
    files.set(path, content);
  }
  const cwd = resolvePath(home, spec.cwd ?? "");
  const global = configFrom(spec.global ?? DEFAULT_GLOBAL_CONFIG);
  addDir(cwd);
  return {
    id,
    home,
    cwd,
    fs: { files, dirs },
    config: global.length ? global : null,
  };
}

/** A fresh, deterministic world: the learner's machine with files and config, other machines, Hub repositories, the setup commands, then the Hub's branch rules. */
export function createWorld(spec: WorldSpec = {}): World {
  const machines: Machine[] = [createMachine(LEARNER, HOME, spec)];
  for (const [id, other] of Object.entries(spec.machines ?? {})) {
    machines.push(createMachine(id, `/home/${id}`, other));
  }
  const world: World = {
    seq: 0,
    objects: new Map(),
    system: configFrom(spec.system ?? {}),
    machines: new Map(machines.map((m) => [m.id, m])),
    repos: new Map(),
    available: new Map(),
  };
  const setUpWorld = (spec.setup ?? []).reduce(
    setUp,
    spec.hub ? createHub(world, spec.hub) : world,
  );
  const ready = spec.hub ? applyRules(setUpWorld, spec.hub) : setUpWorld;
  return spec.actors ? withActors(ready, spec.actors) : ready;
}

function setUp(world: World, step: SetupStep): World {
  if (typeof step !== "string" && "hub" in step) {
    const done = act(world, {
      kind: "hub",
      actor: step.machine,
      action: step.hub,
    });
    if (done.output.exitCode !== 0)
      throw new EngineInvariantError(`Setup failed: ${done.output.stderr}`);
    return done.world;
  }
  const { machine, run } =
    typeof step === "string" ? { machine: LEARNER, run: step } : step;
  const ran = runLine(world, run, machine);
  if (ran.outcomes.some((o) => o.output.exitCode !== 0 || o.request))
    throw new EngineInvariantError(`Setup failed: ${run}`);
  return ran.world;
}
