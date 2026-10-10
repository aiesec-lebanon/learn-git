import type { Route } from "next";
import type { LessonId } from "./registry";

/** The one place that turns content IDs into links. */
export const lessonHref = (id: LessonId): Route => `/learn/${id}` as Route;
