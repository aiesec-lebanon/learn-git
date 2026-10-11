import type { Challenge } from "../define";
import { SCENES } from "../lessons";
import { lessonsOf, type ChapterId, type Lesson } from "../registry";

export type Puzzle = { readonly lesson: Lesson; readonly challenge: Challenge };

/** A chapter's puzzles in lesson order: each ready lesson's challenge. */
export const puzzlesOf = (chapter: ChapterId): readonly Puzzle[] =>
  lessonsOf(chapter).flatMap((lesson) => {
    const challenge = lesson.ready ? SCENES[lesson.id]?.challenge : undefined;
    return challenge ? [{ lesson, challenge }] : [];
  });
