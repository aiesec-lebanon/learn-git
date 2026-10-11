import type { Route } from "next";
import type { ChapterId, LessonId, ScenarioId, TrackId } from "./registry";

/** The one place that turns content IDs into links. */
export const lessonHref = (id: LessonId): Route => `/learn/${id}` as Route;

export const trackHref = (id: TrackId): Route => `/tracks/${id}` as Route;

export const capstoneHref = (id: ChapterId): Route =>
  `/capstones/${id}` as Route;

export const scenarioHref = (id: ScenarioId): Route =>
  `/scenarios/${id}` as Route;

export const referenceHref = (id: string): Route => `/reference/${id}` as Route;

export const orientationHref: Route = "/orientation";
