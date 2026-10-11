import {
  hubActionText,
  shellQuote,
  type HistoryEntry,
  type HubAction,
  type Session,
  type TargetSpec,
  type WorldSpec,
} from "@/engine";
import type { ChapterId, LessonId, ScenarioId } from "./registry";

/** A typed line, or something the learner does on the Hub. */
export type Step = string | HubAction;

export const runStep = (
  session: Session,
  step: Step,
): readonly HistoryEntry[] =>
  typeof step === "string" ? session.run(step) : session.act(step);

/** The step in words, as history shows it. */
export const stepText = (step: Step): string =>
  typeof step === "string" ? step : hubActionText(step);

/** One story beat: the steps it runs on the lesson's world, in order. */
export type BeatScript = {
  readonly id: string;
  readonly run?: readonly Step[];
  /** Steps the beat shows refused; content tests expect exactly these to fail. */
  readonly refusals?: readonly Step[];
};

/** The hint ladder, shown one step at a time on request (learning design 6). */
export type Hints = {
  /** A question that points attention. */
  readonly nudge: string;
  /** The concept to use. */
  readonly pointer: string;
  /** The reference entry the pointer refers to. */
  readonly reference?: string;
  /** The command and why. */
  readonly next: string;
};

/** A start world, a target state and a reference solution the content tests replay. */
export type Checkpoint = {
  readonly goal: string;
  readonly world: WorldSpec;
  readonly target: TargetSpec;
  readonly solution: readonly Step[];
  readonly hints?: Hints;
};

/** A known path shorter than par, and why it works. */
export type UnderPar = {
  readonly solution: readonly Step[];
  readonly why: string;
};

export type Challenge = Checkpoint & {
  readonly par: number;
  readonly underPar?: readonly UnderPar[];
};

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

/** One act of a scenario, detected after every command. */
export type ScenarioAct = {
  readonly id: string;
  readonly title: string;
  /** What to do next, shown while this is the current act. */
  readonly goal: string;
  /** Reached when the world matches any of these; the last act's are the acceptable end states. */
  readonly targets: readonly [TargetSpec, ...TargetSpec[]];
  readonly hints?: Hints;
};

/** A way an expert would solve the scenario, for the debrief. */
export type ExpertPath = {
  readonly title: string;
  readonly solution: readonly Step[];
  readonly tradeoffs: string;
};

export type ScenarioScene = {
  readonly id: ScenarioId;
  /** A teammate's message that opens the scenario. */
  readonly brief: { readonly from: string; readonly message: string };
  readonly goal: string;
  readonly world: WorldSpec;
  /** Two to four, in order. */
  readonly acts: readonly ScenarioAct[];
  /** The first one re-seeds a resumed scenario. */
  readonly experts: readonly [ExpertPath, ...ExpertPath[]];
};

/** Keeps the scene's own types, so tests that replay plain lines see strings. */
export const defineScenario = <S extends ScenarioScene>(scene: S): S => scene;

export const defineWorld = (spec: WorldSpec): WorldSpec => spec;

/** A setup line that writes `text` to `path` exactly. */
export const writeFile = (path: string, text: string): string =>
  `echo -ne ${shellQuote(text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n"))} > ${shellQuote(path)}`;

/** The setup lines that record the folder as it is as the first commit. */
export const FIRST_COMMIT = [
  "git init",
  "git add .",
  'git commit -m "First snapshot"',
] as const;

export const defineLesson = <S extends LessonScene>(scene: S): S => scene;

export const defineCapstone = <S extends CapstoneScene>(scene: S): S => scene;

/** A starting state for a reference entry: a world plus commands that set it up. */
export type ReferencePreset = {
  readonly id: string;
  readonly label: string;
  readonly world: WorldSpec;
  readonly setup?: readonly Step[];
};

/** One form of the command; content tests check its claim on the first preset. */
export type ReferenceVariant = {
  readonly id: string;
  /** A command, or a Hub action on a Hub card. */
  readonly command: Step;
  /** How the form is listed; default the command itself. */
  readonly label?: string;
  /** The state the command reaches (and the preset does not). */
  readonly after?: TargetSpec;
  /** Text the command prints, on either stream. */
  readonly shows?: string;
  /** The preset the claim is checked on; default the first. */
  readonly preset?: string;
};

export type ReferenceEntry = {
  /** The name `git <cmd> -h` asks for, e.g. "init"; Hub cards start with "hub-". */
  readonly id: string;
  /** A Hub card: actions on the simulated GitHub rather than a Git command. */
  readonly hub?: boolean;
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
