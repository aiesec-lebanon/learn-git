import type { LessonScene } from "../define";
import type { LessonId } from "../registry";
import b1_1 from "./b1-1/scene";
import b1_2 from "./b1-2/scene";

/** Scene scripts of the ready lessons; the prose is `./<id>/lesson.mdx`. */
export const SCENES: Partial<Record<LessonId, LessonScene>> = {
  "b1-1": b1_1,
  "b1-2": b1_2,
};
