import type { Route } from "next";
import { readyCapstones } from "./capstones";
import { REFERENCE } from "./reference/registry";
import { readyLessons, readyScenarios, TRACKS } from "./registry";
import {
  capstoneHref,
  challengesHref,
  fieldGuideHref,
  lessonHref,
  orientationHref,
  referenceHref,
  scenarioHref,
  startHref,
  trackHref,
} from "./routes";

/** Every public page, from the registry (Settings is left out: it holds no content). */
export function sitePaths(): Route[] {
  return [
    "/",
    startHref,
    orientationHref,
    ...TRACKS.map((t) => trackHref(t.id)),
    ...readyLessons().map((l) => lessonHref(l.id)),
    ...readyCapstones().map((c) => capstoneHref(c.chapter)),
    ...readyScenarios().map((s) => scenarioHref(s.id)),
    "/playground",
    "/reference",
    ...REFERENCE.map((e) => referenceHref(e.id)),
    challengesHref,
    fieldGuideHref,
  ];
}
