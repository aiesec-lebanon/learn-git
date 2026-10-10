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

/** A starting state for a reference entry: a world plus commands that set it up. */
export type ReferencePreset = {
  readonly id: string;
  readonly label: string;
  readonly world: WorldSpec;
  readonly setup?: readonly string[];
};

/** One form of the command; content tests check its claim on the first preset. */
export type ReferenceVariant = {
  readonly id: string;
  readonly command: string;
  /** The state the command reaches (and the preset does not). */
  readonly after?: TargetSpec;
  /** Text the command prints. */
  readonly shows?: string;
};

export type ReferenceEntry = {
  /** The name `git <cmd> -h` asks for, e.g. "init". */
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly presets: readonly [ReferencePreset, ...ReferencePreset[]];
  readonly variants: readonly [ReferenceVariant, ...ReferenceVariant[]];
  /** Up to three. */
  readonly gotchas: readonly string[];
  readonly legacy?: readonly {
    readonly older: string;
    readonly today: string;
  }[];
  readonly lessons: readonly LessonId[];
};

export const defineReferenceEntry = (entry: ReferenceEntry): ReferenceEntry =>
  entry;
