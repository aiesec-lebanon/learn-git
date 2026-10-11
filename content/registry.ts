/** Everything the site can link to, by stable ID (ADR-005). */

export const TRACKS = [
  {
    id: "beginner",
    title: "Beginner",
    summary: "Snapshots, branches, merging, remotes and the GitHub flow.",
    description:
      "Six chapters from your first commit to a merged pull request: snapshots, undoing changes, branches, merging, remotes and the GitHub flow.",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    summary:
      "Rewrite history safely: amend, reset, revert, rebase, stash, forks and reviews.",
    description:
      "Seven chapters on working with others: undoing commits, rebasing, work in progress, remotes, code review and investigating history.",
  },
] as const;

export const CHAPTERS = [
  { id: "b1", track: "beginner", title: "Snapshots: what Git keeps" },
  { id: "b2", track: "beginner", title: "Seeing and undoing changes" },
  { id: "b3", track: "beginner", title: "Branches" },
  { id: "b4", track: "beginner", title: "Merging" },
  { id: "b5", track: "beginner", title: "Remotes" },
  { id: "b6", track: "beginner", title: "GitHub flow" },
  { id: "i1", track: "intermediate", title: "Undoing commits" },
  { id: "i2", track: "intermediate", title: "Rebase" },
  { id: "i3", track: "intermediate", title: "Interactive rebase" },
  { id: "i4", track: "intermediate", title: "Work in progress" },
  { id: "i5", track: "intermediate", title: "Collaborating through remotes" },
  { id: "i6", track: "intermediate", title: "Code review on GitHub" },
  { id: "i7", track: "intermediate", title: "Investigating history" },
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
  l("b6-3", "b6", "Issues and linking work", 8, true),
  l("i1-1", "i1", "Amend the last commit", 8),
  l("i1-2", "i1", "reset: move the branch, choose how far it ripples", 15),
  l("i1-3", "i1", "revert: undo by adding", 10),
  l("i1-4", "i1", "Choosing the right undo", 8),
  l("i2-1", "i2", "Rebase replays your commits", 12),
  l("i2-2", "i2", "Rebase conflicts", 12),
  l("i2-3", "i2", "Merge or rebase? Pulling with rebase", 10),
  l("i3-1", "i3", "Edit history with the todo list", 12),
  l("i3-2", "i3", "Squash and fixup", 12),
  l("i3-3", "i3", "Split a commit", 10),
  l("i4-1", "i4", "Stash: park your work", 10),
  l("i4-2", "i4", "Craft focused commits: partial staging", 10),
  l("i4-3", "i4", "Cherry-pick: copy a commit", 10),
  l("i5-1", "i5", "Remote-tracking branches, precisely", 10),
  l("i5-2", "i5", "Forks and upstream", 12),
  l("i5-3", "i5", "Rewriting a pushed branch safely", 10),
  l("i5-4", "i5", "Tags and releases", 10),
  l("i6-1", "i6", "Reviewing and being reviewed", 12),
  l("i6-2", "i6", "Merge methods and your history", 10),
  l("i6-3", "i6", "Protected branches and checks", 12),
  l("i7-1", "i7", "Searching history", 10),
  l("i7-2", "i7", "Who changed this line?", 8),
  l("i7-3", "i7", "Reflog: your safety net", 12),
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

export const lessonsOfTrack = (track: TrackId): readonly Lesson[] =>
  LESSONS.filter((lesson) => chapterById(lesson.chapter)?.track === track);

/** The track a lesson belongs to. */
export const trackOfLesson = (lesson: Lesson): TrackId =>
  chapterById(lesson.chapter)?.track ?? "beginner";

export const lessonsOf = (chapter: ChapterId): readonly Lesson[] =>
  LESSONS.filter((lesson) => lesson.chapter === chapter);

export const SCENARIOS = [
  s("s-b1", "beginner", "First contribution", 15, true),
  s("s-b2", "beginner", "Wrong branch, uncommitted work", 8, true),
  s("s-b3", "beginner", "Monday-morning push", 12, true),
  s("s-b4", "beginner", "Conflict on your PR", 15, true),
  s("s-i1", "intermediate", "Committed to main by accident", 10),
  s("s-i2", "intermediate", "Hotfix while mid-feature", 15),
  s("s-i3", "intermediate", "Bad commit on main", 12),
  s("s-i4", "intermediate", "Clean up before review", 15),
  s("s-i5", "intermediate", "First open-source contribution", 20),
  s("s-i6", "intermediate", "Backport to a release", 15),
  s("s-i7", "intermediate", "Red CI on Friday", 12),
  s("s-i8", "intermediate", "The vanishing commits", 12),
] as const;

function s<const I extends string>(
  id: I,
  track: TrackId,
  title: string,
  minutes: number,
  ready = false,
) {
  return { id, track, title, minutes, ready };
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
