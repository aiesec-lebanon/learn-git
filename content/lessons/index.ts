import type { LessonScene } from "../define";
import type { LessonId } from "../registry";

/** Scene scripts of the ready lessons; the prose is `./<id>/lesson.mdx`. */
export const SCENES: Partial<Record<LessonId, LessonScene>> = {};
