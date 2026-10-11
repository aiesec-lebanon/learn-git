import { act, hubActionText } from "../hub/actions";
import { branchRef } from "../refs/names";
import { runLine } from "../run";
import type { ActorScript, HubAction, Outcome, World } from "../types";
import { timeAt } from "./clock";

/** What the learner just did, as the triggers see it. */
export type LearnerMove = {
  /** Learner commands run so far in this timeline. */
  readonly step: number;
  /** The commands of the line just run. */
  readonly texts: readonly string[];
};

/** One actor action: its lines' outcomes, each with the `actor` effect first. */
export type ActorRun = {
  readonly script: ActorScript;
  readonly texts: readonly string[];
  readonly outcomes: readonly Outcome[];
};

function due(world: World, script: ActorScript, move: LearnerMove): boolean {
  const { trigger } = script;
  switch (trigger.kind) {
    case "after-step":
      return move.step >= trigger.step;
    case "after-command":
      return move.texts.some((t) => new RegExp(trigger.pattern).test(t));
    case "at-time":
      return timeAt(world.seq) >= trigger.time;
    case "pull-updated":
      return pullUpdated(world, trigger.repo, trigger.number);
  }
}

function pullUpdated(world: World, fullName: string, number: number): boolean {
  const hosted = world.hub?.repos.get(fullName);
  const pull = hosted?.pulls.find((p) => p.number === number);
  const seen = pull?.reviews.at(-1)?.commit;
  if (!hosted || !pull || pull.state !== "open" || !seen) return false;
  const tip = world.repos.get(hosted.repo)?.refs.get(branchRef(pull.head));
  return tip !== undefined && tip !== seen;
}

/** Adds a schedule to a world (content worlds attach their teammates here). */
export function withActors(
  world: World,
  scripts: readonly ActorScript[],
): World {
  return { ...world, actors: { scripts, fired: [] } };
}

/** A Hub action taken by the script's account, shaped like a line's result. */
function hubStep(world: World, actor: string, action: HubAction) {
  const outcome = act(world, { kind: "hub", actor, action });
  return {
    world: outcome.world,
    outcomes: [outcome],
    texts: [hubActionText(action)],
  };
}

/** Runs one script's lines on its machine and marks it as having acted. */
function perform(
  world: World,
  script: ActorScript,
): { world: World; run: ActorRun } {
  let current = world;
  const outcomes: Outcome[] = [];
  const texts: string[] = [];
  for (const line of script.run) {
    const ran =
      typeof line === "string"
        ? runLine(current, line, script.machine)
        : hubStep(current, script.machine, line);
    ran.outcomes.forEach((outcome, i) => {
      outcomes.push({
        ...outcome,
        effects: [{ kind: "actor", actor: script.name }, ...outcome.effects],
        meta: { ...outcome.meta, counted: false },
      });
      texts.push(ran.texts[i] ?? "");
    });
    current = ran.world;
  }
  const schedule = current.actors ?? { scripts: [], fired: [] };
  current = {
    ...current,
    actors: { ...schedule, fired: [...schedule.fired, script.id] },
  };
  const last = outcomes.at(-1);
  if (last) {
    outcomes[outcomes.length - 1] = {
      ...last,
      world: current,
      effects: script.says
        ? [
            { kind: "actor", actor: script.name, says: script.says },
            ...last.effects.slice(1),
          ]
        : last.effects,
    };
  }
  return { world: current, run: { script, texts, outcomes } };
}

/** Scripts that have not acted yet, in schedule order. */
export function pendingActors(world: World): readonly ActorScript[] {
  const fired = world.actors?.fired ?? [];
  return (world.actors?.scripts ?? []).filter((s) => !fired.includes(s.id));
}

/**
 * Runs every script that is due after `move`, in schedule order; a script
 * that fires can make a later one due (one pass, deterministic). Actor
 * outcomes are never counted toward par.
 */
export function runActors(
  world: World,
  move: LearnerMove,
): { world: World; runs: readonly ActorRun[] } {
  let current = world;
  const runs: ActorRun[] = [];
  for (const script of pendingActors(world)) {
    if (!due(current, script, move)) continue;
    const done = perform(current, script);
    current = done.world;
    runs.push(done.run);
  }
  return { world: current, runs };
}

/** The timeline's Step: the next pending script acts now, whatever its trigger. */
export function stepActor(world: World): {
  world: World;
  runs: readonly ActorRun[];
} {
  const [next] = pendingActors(world);
  if (!next) return { world, runs: [] };
  const done = perform(world, next);
  return { world: done.world, runs: [done.run] };
}
