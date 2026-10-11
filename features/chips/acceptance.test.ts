import { describe, expect, it } from "vitest";
import {
  createWorld,
  machineOf,
  match,
  resolvePath,
  Session,
  shellQuote,
  type TargetSpec,
  type World,
  type WorldSpec,
} from "@/engine";
import { tokenize } from "@/engine/cli/tokenize";
import { CAPSTONES } from "@/content/capstones";
import type { ScenarioScene, Step } from "@/content/define";
import { SCENES } from "@/content/lessons";
import { SCENARIO_SCENES } from "@/content/scenarios";
import { actsReached } from "@/content/scenarios/acts";
import { stageFiles } from "@/features/stage/files";
import { compose, missing, type ParamValue } from "./composer";
import { chipState, pathChoices, VERBS } from "./palette";

/** A chip command, and the text typed into the editor sheet when it opens one. */
type ChipLine = { readonly line: string; readonly answer?: string };

const fail = (why: string): never => {
  throw new Error(why);
};

/** `-am` as `-a -m`, the way the chip flags are listed. */
const splitFlags = (args: readonly string[]) =>
  args.flatMap((a) =>
    /^-[a-zA-Z]{2,}$/.test(a) ? [...a.slice(1)].map((c) => `-${c}`) : [a],
  );

/** One chip from the palette, filled the way a learner would fill it. */
function chip(world: World, program: string, args: readonly string[]): string {
  const [name = "", ...rest] = args;
  const verb =
    VERBS.find((v) => v.program === program && v.name === name) ??
    fail(`no ${program} chip "${name}"`);
  if (!verb.ready(chipState(world)))
    fail(`the ${name} chip is not offered here`);
  const values: ParamValue[] = [];
  const words = splitFlags(rest);
  for (let i = 0; i < words.length; i++) {
    const word = words[i] ?? "";
    const flagged = verb.params.findIndex(
      (p) => p.kind !== "paths" && "flag" in p && p.flag === word,
    );
    if (flagged >= 0) {
      const param = verb.params[flagged];
      values[flagged] = param?.kind === "flag" ? true : (words[++i] ?? "");
      continue;
    }
    const slot = verb.params.findIndex(
      (p, at) =>
        (p.kind === "value" && !p.flag && values[at] === undefined) ||
        (p.kind === "paths" && !(p.single && values[at] !== undefined)),
    );
    const param = verb.params[slot] ?? fail(`"${word}" has no chip field`);
    if (param.kind === "value") {
      if (param.choices && !param.choices.includes(word))
        fail(`"${word}" is not a ${param.label} choice`);
      values[slot] = word;
    } else if (param.kind === "paths") {
      if (!pathChoices(world, param.pick).includes(word))
        fail(`"${word}" is not offered as ${param.label}`);
      values[slot] = [...((values[slot] as string[] | undefined) ?? []), word];
    }
  }
  const gap = missing(verb, values);
  if (gap) fail(`${name} still needs ${gap}`);
  return compose(verb, values);
}

/** Tracked files changed in the working tree: what `commit -a` would stage. */
const trackedChanges = (world: World) =>
  stageFiles(world)
    .worktree.filter((f) => f.state === "modified" || f.state === "deleted")
    .map((f) => f.path);

/** The chip lines for one simple command, given the world it runs in. */
function chipLines(world: World, text: string, raw: string): ChipLine[] {
  const parsed = tokenize(raw, machineOf(world).home);
  if (!parsed.ok) return fail(`cannot parse ${raw}`);
  const [step] = parsed.steps;
  const words = step?.command.words.map((w) => w.text) ?? [];
  const redirect = step?.command.redirect;
  if (redirect) {
    if (words[0] !== "echo") fail(`no chip writes ${text}`);
    const scratch = new Session(world);
    scratch.run(raw);
    const machine = machineOf(scratch.getSnapshot().world);
    const target = redirect.target.text;
    const answer = machine.fs.files.get(resolvePath(machine.cwd, target));
    return [{ line: `edit ${shellQuote(target)}`, answer: answer ?? "" }];
  }
  if (words[0] !== "git") return [{ line: chip(world, "shell", words) }];
  const args = splitFlags(words.slice(1));
  // The config chip writes the older form, which Git accepts as well.
  if (args[0] === "config" && args[1] === "set")
    return [{ line: chip(world, "git", ["config", ...args.slice(2)]) }];
  if (args[0] === "commit" && args.includes("-a")) {
    const add = chip(world, "git", ["add", ...trackedChanges(world)]);
    const scratch = new Session(world);
    scratch.run(add);
    const commit = chip(
      scratch.getSnapshot().world,
      "git",
      args.filter((a) => a !== "-a"),
    );
    return [{ line: add }, { line: commit }];
  }
  return [{ line: chip(world, "git", args) }];
}

/** Takes a step with chips only (Hub actions are buttons already). */
function takeWithChips(session: Session, step: Step) {
  if (typeof step !== "string") {
    session.act(step);
    return;
  }
  const { world } = session.getSnapshot();
  const parsed = tokenize(step, machineOf(world).home);
  if (!parsed.ok) fail(`cannot parse ${step}`);
  const parts = parsed.ok ? parsed.steps : [];
  for (const part of parts) {
    const raw = [
      ...part.command.words.map((w) => shellQuote(w.text)),
      ...(part.command.redirect
        ? [
            part.command.redirect.op,
            shellQuote(part.command.redirect.target.text),
          ]
        : []),
    ].join(" ");
    for (const { line, answer } of chipLines(
      session.getSnapshot().world,
      step,
      raw,
    )) {
      session.run(line);
      if (answer !== undefined) session.resume(answer);
    }
  }
}

function chipRun(world: WorldSpec, solution: readonly Step[]): World {
  const session = new Session(createWorld(world));
  for (const step of solution) {
    try {
      takeWithChips(session, step);
    } catch (e) {
      throw new Error(
        `${typeof step === "string" ? step : step.type}: ${(e as Error).message}`,
      );
    }
  }
  return session.getSnapshot().world;
}

type Checkpoint = {
  world: WorldSpec;
  target: TargetSpec;
  solution: readonly Step[];
};

const checkpoints: (readonly [string, Checkpoint])[] = [
  ...Object.entries(SCENES).flatMap(([id, s]) =>
    s
      ? [
          [`${id} Your turn`, s.yourTurn] as const,
          ...(s.challenge ? [[`${id} puzzle`, s.challenge] as const] : []),
        ]
      : [],
  ),
  ...Object.entries(CAPSTONES).flatMap(([id, c]) =>
    c ? [[`capstone ${id}`, c] as const] : [],
  ),
];

describe("every Beginner target can be reached with chips", () => {
  it.each(checkpoints)("%s", (_, { world, target, solution }) => {
    expect(match(chipRun(world, solution), target).differences).toEqual([]);
  });

  it.each(
    Object.values(SCENARIO_SCENES).filter((s): s is ScenarioScene => !!s),
  )("scenario $id", (scene) => {
    const end = chipRun(scene.world, scene.experts[0].solution);
    expect(actsReached(scene, end)).toBe(scene.acts.length);
  });
});
