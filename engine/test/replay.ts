import { tokenize } from "../cli/tokenize";
import { GIT_REGISTRY } from "../commands";
import { execute, mergeOutcomes, resume } from "../execute";
import { relativeTo, resolvePath } from "../files/paths";
import { isGitPath, makeDir } from "../files/worktree";
import { GIT_COMMANDS } from "../messages/commands";
import { SHELL_REGISTRY } from "../shell";
import { commitText } from "../objects/serialize";
import { reflogLine } from "../refs/reflog";
import { allRefs } from "../refs/refs";
import { indexEntries } from "../staging/index";
import type {
  ConfigFile,
  GitObject,
  Index,
  IndexEntry,
  Invocation,
  MachineId,
  Oid,
  RefName,
  ReflogEntry,
  Repo,
  RepoPath,
  World,
} from "../types";
import { machineOf, repoIdFor, withMachine } from "../world/access";
import { HUB } from "../world/network";
import { HOME, LEARNER } from "../world/defaults";
import { importObject } from "./import";
import { createWorld } from "../world/create";
import { effectChanges, stateChanges } from "./effects-match-state";
import { fixtureScripts } from "./fixtures";
import type {
  RecordedFixture,
  RecordedMachine,
  RecordedObject,
  RecordedRepo,
  RecordedStep,
} from "./fixtures";

type Final = RecordedFixture["final"];

const pairs = (config: ConfigFile) =>
  config.map((e) => [e.key, e.value] as [string, string | null]);

function dumpObject(object: GitObject): RecordedObject {
  switch (object.type) {
    case "blob":
      return { type: "blob", body: object.content };
    case "tree":
      return { type: "tree", entries: object.entries.map((e) => ({ ...e })) };
    case "commit":
      return { type: "commit", body: commitText(object) };
  }
}

/** Pseudo-ref and operation files as `.git` holds them. */
function pseudoFiles(repo: Repo): Record<string, string> {
  const out: Record<string, string> = {};
  if (repo.op?.kind === "merge") {
    out.MERGE_HEAD = `${repo.op.head}
`;
    out.MERGE_MSG = repo.op.message;
  }
  if (repo.fetchHead !== undefined) out.FETCH_HEAD = repo.fetchHead;
  if (repo.origHead)
    out.ORIG_HEAD = `${repo.origHead}
`;
  return out;
}

function dumpRepo(world: World, repo: Repo): RecordedRepo {
  const pseudo = pseudoFiles(repo);
  const have = world.available.get(repo.id) ?? new Set<Oid>();
  return {
    head:
      repo.head.kind === "symbolic"
        ? { ref: repo.head.ref }
        : { oid: repo.head.oid },
    refs: Object.fromEntries(allRefs(repo)),
    objects: Object.fromEntries(
      [...world.objects]
        .filter(([oid]) => have.has(oid))
        .map(([oid, o]) => [oid, dumpObject(o)]),
    ),
    index: indexEntries(repo.index).map((e) => ({ ...e })),
    config: pairs(repo.config),
    reflogs: Object.fromEntries(
      [...repo.reflogs].map(([k, log]) => [k, log.map(reflogLine)]),
    ),
    ...(Object.keys(pseudo).length ? { pseudo } : {}),
  };
}

function dumpMachine(world: World, id: MachineId): RecordedMachine {
  const machine = machineOf(world, id);
  const rel = (path: string) => relativeTo(machine.home, path);
  const files: Record<string, string> = {};
  for (const [path, content] of machine.fs.files) {
    const r = rel(path);
    if (r && !isGitPath(r)) files[r] = content;
  }
  const dirs = [...machine.fs.dirs]
    .map(rel)
    .filter((r): r is string => !!r && !isGitPath(r))
    .sort();
  const repos: Record<string, RecordedRepo> = {};
  for (const repo of world.repos.values()) {
    if (repo.machine !== id) continue;
    repos[rel(repo.workdir) ?? repo.workdir] = dumpRepo(world, repo);
  }
  return {
    files,
    dirs,
    config: {
      system: pairs(world.system),
      global: pairs(machine.config ?? []),
    },
    repos,
  };
}

/** The world in the recorder's dump format, so final states compare directly. */
export function dumpWorld(world: World): Final {
  const others = [...world.machines.keys()].filter(
    (id) => id !== LEARNER && id !== HUB,
  );
  const hosted = [...world.repos.values()].filter((r) => r.machine === HUB);
  return {
    ...dumpMachine(world, LEARNER),
    ...(others.length
      ? {
          machines: Object.fromEntries(
            others.map((id) => [id, dumpMachine(world, id)]),
          ),
        }
      : {}),
    ...(world.machines.has(HUB)
      ? {
          hub: Object.fromEntries(
            hosted.map((r) => [r.workdir.slice(1), dumpRepo(world, r)]),
          ),
        }
      : {}),
  };
}

/** Git's option table after a usage synopsis is left to the reference entry. */
export function withoutOptionTable(text: string): string {
  const at = text.indexOf("usage: ");
  if (at < 0) return text;
  const end = text.indexOf("\n\n", at);
  return end < 0 ? text : text.slice(0, end + 2);
}

function singleInvocation(
  world: World,
  cmd: string,
  machine?: MachineId,
): Invocation {
  const parsed = tokenize(cmd, machineOf(world, machine).home);
  if (!parsed.ok || parsed.steps.length !== 1) {
    throw new Error(`Fixture steps must be one simple command: ${cmd}`);
  }
  const [step] = parsed.steps;
  if (!step) throw new Error(cmd);
  return machine ? { ...step.command, machine } : step.command;
}

/** Why a fixture cannot replay yet (a Git command the engine lacks), or null. */
export function pendingReason(fixture: RecordedFixture): string | null {
  const replayed = isSeeded(fixture) ? fixture.steps.slice(-1) : fixture.steps;
  for (const step of replayed) {
    const words = step.cmd.split(/\s+/);
    if (words[0] !== "git" && !SHELL_REGISTRY.has(words[0] ?? "")) {
      return `${words[0]} is not simulated`;
    }
    const sub =
      words[0] === "git"
        ? words.slice(1).find((w) => !w.startsWith("-"))
        : undefined;
    if (
      sub &&
      GIT_COMMANDS.has(sub) &&
      !GIT_REGISTRY.has(sub) &&
      !["help", "version"].includes(sub)
    ) {
      return `git ${sub} is not simulated yet`;
    }
  }
  return null;
}

export type ReplayedStep = {
  expected: RecordedStep;
  actual: RecordedStep;
  /** State changes derived from the worlds and from the emitted effects. */
  changes: { derived: string[]; emitted: string[] };
};

export const isSeeded = (fixture: RecordedFixture) =>
  (fixtureScripts.get(fixture.id) ?? fixture.script).mode === "seeded";

const parseReflogLine = (line: string): ReflogEntry => {
  const [left = "", message = ""] = line.split("\t");
  const match = /^(\S+) (\S+) (.*) <(.*)> (\d+) ([+-]\d{4})$/.exec(left);
  if (!match) throw new Error(`Bad reflog line: ${line}`);
  const [, old = "", next = "", name = "", email = "", time = "0", tz = ""] =
    match;
  const oid = (s: string) => (/^0+$/.test(s) ? null : (s as Oid));
  return {
    old: oid(old),
    new: oid(next),
    who: { name, email, time: Number(time), tz },
    message,
  };
};

function seedPseudo(files: Record<string, string>): Partial<Repo> {
  const oid = (text: string | undefined) => text?.trim() as Oid | undefined;
  const origHead = oid(files.ORIG_HEAD);
  const head = oid(files.MERGE_HEAD);
  return {
    ...(files.FETCH_HEAD === undefined ? {} : { fetchHead: files.FETCH_HEAD }),
    ...(origHead ? { origHead } : {}),
    ...(head
      ? { op: { kind: "merge", head, message: files.MERGE_MSG ?? "" } }
      : {}),
  };
}

/** The world a recording ends in (mode `seeded`: built from `final`, not replayed). */
export function seedWorld(fixture: RecordedFixture): World {
  const { final } = fixture;
  const cwd = fixture.steps.at(-2)?.cwd ?? HOME;
  const base = createWorld({
    files: final.files,
    dirs: final.dirs,
    cwd: relativeTo(HOME, cwd) ?? "",
  });
  const config = (pairs: [string, string | null][]): ConfigFile =>
    pairs.map(([key, value]) => ({ key, value }));
  const objects = new Map<Oid, GitObject>();
  const repos = new Map<string, Repo>();
  const available = new Map<string, ReadonlySet<Oid>>();
  let fs = machineOf(base).fs;
  for (const [rel, recorded] of Object.entries(final.repos)) {
    for (const [oid, object] of Object.entries(recorded.objects)) {
      objects.set(oid as Oid, importObject(object));
    }
    const commits = Object.entries(recorded.objects)
      .flatMap(([oid, object]) => {
        const imported = importObject(object);
        return imported.type === "commit"
          ? [[oid as Oid, imported.committer.time] as const]
          : [];
      })
      .sort((a, b) => a[1] - b[1]);
    const workdir = resolvePath(HOME, rel);
    fs = makeDir(fs, `${workdir}/.git`);
    const index: Index = new Map(
      recorded.index.map((e) => [
        e.path as RepoPath,
        [{ ...e, path: e.path as RepoPath, oid: e.oid as Oid } as IndexEntry],
      ]),
    );
    const id = repoIdFor(LEARNER, workdir);
    available.set(id, new Set(Object.keys(recorded.objects) as Oid[]));
    repos.set(id, {
      id,
      machine: LEARNER,
      workdir,
      head:
        "ref" in recorded.head
          ? { kind: "symbolic", ref: recorded.head.ref as RefName }
          : { kind: "detached", oid: recorded.head.oid as Oid },
      refs: new Map(
        Object.entries(recorded.refs).map(([r, o]) => [r as RefName, o as Oid]),
      ),
      reflogs: new Map(
        Object.entries(recorded.reflogs).map(([k, lines]) => [
          k,
          lines.map(parseReflogLine),
        ]),
      ),
      index,
      config: config(recorded.config),
      arrival: commits.map(([oid]) => oid),
      ...seedPseudo(recorded.pseudo ?? {}),
    });
  }
  const machine = {
    ...machineOf(base),
    fs,
    config: config(final.config.global),
  };
  return {
    ...withMachine(base, machine),
    seq: fixture.steps.length - 1,
    objects,
    system: config(final.config.system),
    repos,
    available,
  };
}

/** Replays the fixture's steps (mode `full`) or only its last step on the seeded final world. */
export function replayFixture(fixture: RecordedFixture): {
  steps: ReplayedStep[];
  final: Final;
  world: World;
} {
  const seeded = isSeeded(fixture);
  let world = seeded
    ? seedWorld(fixture)
    : createWorld((fixtureScripts.get(fixture.id) ?? fixture.script).world);
  const steps = (seeded ? fixture.steps.slice(-1) : fixture.steps).map(
    (expected) => {
      const before = world;
      const { machine } = expected;
      let outcome = execute(
        world,
        singleInvocation(world, expected.cmd, machine),
      );
      const request = outcome.request;
      const editor =
        request?.kind === "editor"
          ? { received: request.initial, wrote: expected.editor?.wrote ?? null }
          : undefined;
      if (editor) {
        outcome = mergeOutcomes(outcome, resume(outcome.world, editor.wrote));
      }
      world = outcome.world;
      const changes = {
        derived: stateChanges(before, world),
        emitted: effectChanges(outcome.effects),
      };
      const strip = (s: string) =>
        outcome.output.exitCode === 129 ? withoutOptionTable(s) : s;
      const actual: RecordedStep = {
        cmd: expected.cmd,
        stdout: strip(outcome.output.stdout),
        stderr: strip(outcome.output.stderr),
        exitCode: outcome.output.exitCode,
        cwd: machineOf(world, machine).cwd,
        ...(machine ? { machine } : {}),
        ...(editor ? { editor } : {}),
      };
      const normalized = {
        ...expected,
        stdout:
          expected.exitCode === 129
            ? withoutOptionTable(expected.stdout)
            : expected.stdout,
        stderr:
          expected.exitCode === 129
            ? withoutOptionTable(expected.stderr)
            : expected.stderr,
      };
      const comparable: RecordedStep = { ...normalized };
      if (!comparable.editor?.received) delete comparable.editor;
      return { expected: comparable, actual, changes };
    },
  );
  return { steps, final: dumpWorld(world), world };
}
