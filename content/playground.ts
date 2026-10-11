import type { Route } from "next";
import type { TargetSpec, WorldSpec } from "@/engine";
import type { Hints } from "./define";
import { SCENES } from "./lessons";
import { lessonCode, readyLessons } from "./registry";
import { conflictKit } from "./worlds/conflict-kit";
import { emptyFolder } from "./worlds/empty-folder";
import { recipeSiteWithIdentity } from "./worlds/recipe-site";
import { teamRepoPlayground } from "./worlds/team-repo";

export type StarterWorld = {
  readonly id: string;
  readonly title: string;
  readonly world: WorldSpec;
};

const EMPTY: StarterWorld = {
  id: "empty-folder",
  title: "Empty folder",
  world: emptyFolder,
};

export const STARTER_WORLDS: readonly StarterWorld[] = [
  EMPTY,
  { id: "recipe-site", title: "Recipe site", world: recipeSiteWithIdentity },
  {
    id: "team-repo",
    title: "Team repo with origin and Sam",
    world: teamRepoPlayground,
  },
  { id: "conflict-kit", title: "Conflict kit", world: conflictKit },
];

export type PlaygroundPrompt = {
  readonly id: string;
  readonly title: string;
  readonly goal: string;
  readonly world: WorldSpec;
  readonly target: TargetSpec;
  readonly hints?: Hints;
};

/** The Your turn prompt of every ready lesson, by lesson ID. */
export const PROMPTS: readonly PlaygroundPrompt[] = readyLessons().flatMap(
  (lesson) => {
    const turn = SCENES[lesson.id]?.yourTurn;
    return turn
      ? [
          {
            id: lesson.id,
            title: `${lessonCode(lesson.id)} ${lesson.title}`,
            goal: turn.goal,
            world: turn.world,
            target: turn.target,
            hints: turn.hints,
          },
        ]
      : [];
  },
);

export type PlaygroundChoice = {
  /** Names the sandbox: one per world or prompt. */
  readonly key: string;
  readonly world: WorldSpec;
  readonly starter: StarterWorld | null;
  readonly prompt: PlaygroundPrompt | null;
};

/** Reads the query against the allowlists; anything unknown falls back to the first world. */
export function choosePlayground(
  world: string | null,
  prompt: string | null,
): PlaygroundChoice {
  const p = PROMPTS.find((x) => x.id === prompt);
  if (p)
    return { key: `prompt:${p.id}`, world: p.world, starter: null, prompt: p };
  const w = STARTER_WORLDS.find((x) => x.id === world) ?? EMPTY;
  return { key: `world:${w.id}`, world: w.world, starter: w, prompt: null };
}

export const playgroundHref = (
  query: { world: string } | { prompt: string },
): Route =>
  `/playground?${new URLSearchParams(query as Record<string, string>)}` as Route;
