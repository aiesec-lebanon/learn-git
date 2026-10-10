import type { Route } from "next";
import { CAPSTONES } from "./capstones";
import {
  chapterCode,
  chaptersOf,
  lessonCode,
  lessonsOf,
  type TrackId,
} from "./registry";
import { capstoneHref, lessonHref } from "./routes";

export type CourseStep = { readonly href: Route; readonly label: string };

/** A track's published pages in order: each chapter's lessons, then its capstone. */
export function courseSteps(track: TrackId): readonly CourseStep[] {
  return chaptersOf(track).flatMap((chapter) => [
    ...lessonsOf(chapter.id)
      .filter((lesson) => lesson.ready)
      .map((lesson) => ({
        href: lessonHref(lesson.id),
        label: `${lessonCode(lesson.id)} ${lesson.title}`,
      })),
    ...(CAPSTONES[chapter.id]
      ? [
          {
            href: capstoneHref(chapter.id),
            label: `Capstone ${chapterCode(chapter.id)}`,
          },
        ]
      : []),
  ]);
}

/** The steps before and after a page of the track. */
export function neighbours(track: TrackId, href: Route) {
  const steps = courseSteps(track);
  const at = steps.findIndex((step) => step.href === href);
  return at < 0
    ? { previous: undefined, next: undefined }
    : { previous: steps[at - 1], next: steps[at + 1] };
}
