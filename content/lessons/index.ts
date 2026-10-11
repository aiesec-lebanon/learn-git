import type { LessonScene } from "../define";
import type { LessonId } from "../registry";
import b1_1 from "./b1-1/scene";
import b1_2 from "./b1-2/scene";
import b1_3 from "./b1-3/scene";
import b2_1 from "./b2-1/scene";
import b2_2 from "./b2-2/scene";
import b2_3 from "./b2-3/scene";
import b3_1 from "./b3-1/scene";
import b3_2 from "./b3-2/scene";
import b3_3 from "./b3-3/scene";
import b4_1 from "./b4-1/scene";
import b4_2 from "./b4-2/scene";
import b4_3 from "./b4-3/scene";
import b5_1 from "./b5-1/scene";
import b5_2 from "./b5-2/scene";
import b5_3 from "./b5-3/scene";
import b6_1 from "./b6-1/scene";
import b6_2 from "./b6-2/scene";

/** Scene scripts of the ready lessons; the prose is `./<id>/lesson.mdx`. */
export const SCENES: Partial<Record<LessonId, LessonScene>> = {
  "b1-1": b1_1,
  "b1-2": b1_2,
  "b1-3": b1_3,
  "b2-1": b2_1,
  "b2-2": b2_2,
  "b2-3": b2_3,
  "b3-1": b3_1,
  "b3-2": b3_2,
  "b3-3": b3_3,
  "b4-1": b4_1,
  "b4-2": b4_2,
  "b4-3": b4_3,
  "b5-1": b5_1,
  "b5-2": b5_2,
  "b5-3": b5_3,
  "b6-1": b6_1,
  "b6-2": b6_2,
};
