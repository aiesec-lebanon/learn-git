import type { TargetSpec, WorldSpec } from "@/engine";
import type { ChapterId, LessonId } from "./registry";

/** One story beat: the commands it runs on the lesson's world, in order. */
export type BeatScript = {
  readonly id: string;
  readonly run?: readonly string[];
};

/** The hint ladder, shown one step at a time on request (learning design 6). */
export type Hints = {
  /** A question that points attention. */
  readonly nudge: string;
  /** The concept to use. */
  readonly pointer: string;
  /** The command and why. */
  readonly next: string;
};

/** A start world, a target state and a reference solution the content tests replay. */
export type Checkpoint = {
  readonly goal: string;
  readonly world: WorldSpec;
  readonly target: TargetSpec;
  readonly solution: readonly string[];
  readonly hints?: Hints;
};

export type Challenge = Checkpoint & { readonly par: number };

export type LessonScene = {
  readonly id: LessonId;
  readonly world: WorldSpec;
  readonly beats: readonly BeatScript[];
  readonly yourTurn: Checkpoint;
  /** Shown only when challenge mode is on (I6). */
  readonly challenge?: Challenge;
};

/** A chapter's unguided checkpoint; reaching its target finishes the chapter. */
export type CapstoneScene = Checkpoint & { readonly chapter: ChapterId };

export const defineWorld = (spec: WorldSpec): WorldSpec => spec;

export const defineLesson = (scene: LessonScene): LessonScene => scene;

export const defineCapstone = (scene: CapstoneScene): CapstoneScene => scene;
