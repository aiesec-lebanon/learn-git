/** Everything the site can link to, by stable ID (ADR-005). */

export const TRACKS = [{ id: "beginner", title: "Beginner" }] as const;

export const CHAPTERS = [
  { id: "b1", track: "beginner", title: "Snapshots: what Git keeps" },
  { id: "b2", track: "beginner", title: "Seeing and undoing changes" },
  { id: "b3", track: "beginner", title: "Branches" },
  { id: "b4", track: "beginner", title: "Merging" },
  { id: "b5", track: "beginner", title: "Remotes" },
  { id: "b6", track: "beginner", title: "GitHub flow" },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];
export type ChapterId = (typeof CHAPTERS)[number]["id"];

type LessonEntry = {
  readonly id: string;
  readonly chapter: ChapterId;
  readonly title: string;
  readonly minutes: number;
  /** Written and published; the others are listed but not routed yet. */
  readonly ready: boolean;
};

export const LESSONS = [
  l("b1-1", "b1", "Save points for a whole project", 10, true),
  l("b1-2", "b1", "Three places your work lives", 12, true),
  l("b1-3", "b1", "History is a chain of snapshots", 10, true),
  l("b2-1", "b2", "What changed? Reading diffs", 10, true),
  l("b2-2", "b2", "Undo before you commit", 10, true),
  l("b2-3", "b2", "Tracked, untracked, ignored", 10, true),
  l("b3-1", "b3", "A branch is a pointer", 12, true),
  l("b3-2", "b3", "Diverging work", 10, true),
  l("b3-3", "b3", "Visiting the past: detached HEAD", 12, true),
  l("b4-1", "b4", "Fast-forward merges", 8, true),
  l("b4-2", "b4", "Three-way merges", 10, true),
  l("b4-3", "b4", "Merge conflicts", 15, true),
  l("b5-1", "b5", "Clone: your copy and origin", 12, true),
  l("b5-2", "b5", "Fetch and pull: catching up", 12, true),
  l("b5-3", "b5", "Push and upstream", 12, true),
  l("b6-1", "b6", "Your repository on GitHub", 10, true),
  l("b6-2", "b6", "Pull requests: propose, review, merge", 15, true),
  l("b6-3", "b6", "Issues and linking work", 8),
] as const;

function l<const I extends string>(
  id: I,
  chapter: ChapterId,
  title: string,
  minutes: number,
  ready = false,
) {
  return { id, chapter, title, minutes, ready } satisfies LessonEntry;
}

export type LessonId = (typeof LESSONS)[number]["id"];
export type Lesson = (typeof LESSONS)[number];

/** Lessons that have content and a page. */
export const readyLessons = (): readonly Lesson[] =>
  LESSONS.filter((lesson) => lesson.ready);

export const lessonById = (id: string): Lesson | undefined =>
  LESSONS.find((lesson) => lesson.id === id);

export const trackById = (id: string) => TRACKS.find((t) => t.id === id);

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);

export const chaptersOf = (track: TrackId) =>
  CHAPTERS.filter((c) => c.track === track);

export const lessonsOf = (chapter: ChapterId): readonly Lesson[] =>
  LESSONS.filter((lesson) => lesson.chapter === chapter);

export const SCENARIOS = [
  s("s-b1", "First contribution", 15),
  s("s-b2", "Wrong branch, uncommitted work", 8, true),
  s("s-b3", "Monday-morning push", 12, true),
  s("s-b4", "Conflict on your PR", 15),
] as const;

function s<const I extends string>(
  id: I,
  title: string,
  minutes: number,
  ready = false,
) {
  return { id, track: "beginner" as TrackId, title, minutes, ready };
}

export type ScenarioId = (typeof SCENARIOS)[number]["id"];
export type Scenario = (typeof SCENARIOS)[number];

/** Scenarios that have content and a page. */
export const readyScenarios = (): readonly Scenario[] =>
  SCENARIOS.filter((scenario) => scenario.ready);

export const scenariosOf = (track: TrackId): readonly Scenario[] =>
  SCENARIOS.filter((scenario) => scenario.track === track);

export const scenarioById = (id: string): Scenario | undefined =>
  SCENARIOS.find((scenario) => scenario.id === id);

/** The scenario's code as the curriculum writes it, e.g. "S-B2". */
export const scenarioCode = (id: ScenarioId): string => id.toUpperCase();

/** The chapter's code as the curriculum writes it, e.g. "B1". */
export const chapterCode = (id: ChapterId): string => id.toUpperCase();

/** The lesson's code as the curriculum writes it, e.g. "B1.1". */
export const lessonCode = (id: LessonId): string =>
  id.toUpperCase().replace("-", ".");
