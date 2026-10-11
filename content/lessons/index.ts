import type { LessonScene } from "../define";
import type { LessonId } from "../registry";
import b1_1 from "./b1-1/scene";
import b1_2 from "./b1-2/scene";
import b1_3 from "./b1-3/scene";
import b2_1 from "./b2-1/scene";
import b2_2 from "./b2-2/scene";
import b2_3 from "./b2-3/scene";
import b3_1 from "./b3-1/scene";

/** Scene scripts of the ready lessons; the prose is `./<id>/lesson.mdx`. */
export const SCENES: Partial<Record<LessonId, LessonScene>> = {
  "b1-1": b1_1,
  "b1-2": b1_2,
  "b1-3": b1_3,
  "b2-1": b2_1,
  "b2-2": b2_2,
  "b2-3": b2_3,
  "b3-1": b3_1,
};
