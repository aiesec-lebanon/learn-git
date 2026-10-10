import { tokenize } from "../cli/tokenize";
import { GIT_REGISTRY } from "../commands";
import { execute } from "../execute";
import { relativeTo } from "../files/paths";
import { isGitPath } from "../files/worktree";
import { GIT_COMMANDS } from "../messages/commands";
import { SHELL_REGISTRY } from "../shell";
import { commitText } from "../objects/serialize";
import { reflogLine } from "../refs/reflog";
import { indexEntries } from "../staging/index";
import type { ConfigFile, GitObject, Invocation, World } from "../types";
import { machineOf } from "../world/access";
import { createWorld } from "../world/create";
import type {
  RecordedFixture,
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

/** The world in the recorder's dump format, so final states compare directly. */
export function dumpWorld(world: World): Final {
  const machine = machineOf(world);
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
    repos[rel(repo.workdir) ?? repo.workdir] = {
      head:
        repo.head.kind === "symbolic"
          ? { ref: repo.head.ref }
          : { oid: repo.head.oid },
      refs: Object.fromEntries(repo.refs),
      objects: Object.fromEntries(
        [...world.objects].map(([oid, o]) => [oid, dumpObject(o)]),
      ),
      index: indexEntries(repo.index).map((e) => ({ ...e })),
      config: pairs(repo.config),
      reflogs: Object.fromEntries(
        [...repo.reflogs].map(([k, log]) => [k, log.map(reflogLine)]),
      ),
    };
  }
  return {
    files,
    dirs,
    config: { system: pairs(world.system), global: pairs(machine.config) },
    repos,
  };
}

/** Git's option table after a usage synopsis is left to the reference entry. */
export function withoutOptionTable(text: string): string {
  const at = text.indexOf("usage: ");
  if (at < 0) return text;
  const end = text.indexOf("\n\n", at);
  return end < 0 ? text : text.slice(0, end + 2);
}

function singleInvocation(world: World, cmd: string): Invocation {
  const parsed = tokenize(cmd, machineOf(world).home);
  if (!parsed.ok || parsed.steps.length !== 1) {
    throw new Error(`Fixture steps must be one simple command: ${cmd}`);
  }
  const [step] = parsed.steps;
  if (!step) throw new Error(cmd);
  return step.command;
}

/** Why a fixture cannot replay yet (a Git command the engine lacks), or null. */
export function pendingReason(fixture: RecordedFixture): string | null {
  for (const step of fixture.steps) {
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

export type ReplayedStep = { expected: RecordedStep; actual: RecordedStep };

/** Replays every step from the fixture's starting world (mode `full`). */
export function replayFixture(fixture: RecordedFixture): {
  steps: ReplayedStep[];
  final: Final;
  world: World;
} {
  let world = createWorld(fixture.script.world);
  const steps = fixture.steps.map((expected) => {
    const outcome = execute(world, singleInvocation(world, expected.cmd));
    world = outcome.world;
    const strip = (s: string) =>
      outcome.output.exitCode === 129 ? withoutOptionTable(s) : s;
    const actual: RecordedStep = {
      cmd: expected.cmd,
      stdout: strip(outcome.output.stdout),
      stderr: strip(outcome.output.stderr),
      exitCode: outcome.output.exitCode,
      cwd: machineOf(world).cwd,
    };
    const normalized =
      expected.exitCode === 129
        ? {
            ...expected,
            stdout: withoutOptionTable(expected.stdout),
            stderr: withoutOptionTable(expected.stderr),
          }
        : expected;
    const comparable: RecordedStep = { ...normalized };
    delete comparable.editor;
    return { expected: comparable, actual };
  });
  return { steps, final: dumpWorld(world), world };
}
