import type { LessonScene } from "../define";
import type { LessonId } from "../registry";
import b1_1 from "./b1-1/scene";

/** Scene scripts of the ready lessons; the prose is `./<id>/lesson.mdx`. */
export const SCENES: Partial<Record<LessonId, LessonScene>> = {
  "b1-1": b1_1,
};
