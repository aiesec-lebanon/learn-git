import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CAPSTONES } from "@/content/capstones";
import {
  chapterCode,
  chaptersOf,
  lessonCode,
  lessonsOf,
  scenarioCode,
  scenariosOf,
  TRACKS,
  trackById,
} from "@/content/registry";
import { capstoneHref, lessonHref, scenarioHref } from "@/content/routes";
import { PuzzlesLink } from "@/features/challenge/puzzles-link";
import { ChapterStatus } from "@/features/track/chapter-status";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { AppLink } from "@/ui/link";

export function generateStaticParams() {
  return TRACKS.map((track) => ({ trackId: track.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/tracks/[trackId]">): Promise<Metadata> {
  const track = trackById((await params).trackId);
  return track
    ? {
        title: `${track.title} track`,
        description: track.description,
      }
    : {};
}

export default async function TrackPage({
  params,
}: PageProps<"/tracks/[trackId]">) {
  const track = trackById((await params).trackId);
  if (!track) notFound();
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="m-0 text-3xl font-bold">{track.title} track</h1>
      <p className="mt-3 max-w-prose">
        Take the chapters in order or start anywhere: nothing is locked. A
        chapter is finished when you reach its capstone target.
      </p>
      <Suspense fallback={null}>
        <PuzzlesLink />
      </Suspense>
      <ol className="m-0 mt-8 grid list-none gap-6 p-0">
        {chaptersOf(track.id).map((chapter) => (
          <li
            key={chapter.id}
            className="grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-2 sm:p-6"
          >
            <h2 className="m-0 text-xl font-bold">
              {chapterCode(chapter.id)} {chapter.title}
            </h2>
            <Suspense fallback={null}>
              <ChapterStatus chapter={chapter.id} />
            </Suspense>
            <ol className="m-0 grid list-none gap-1 p-0">
              {lessonsOf(chapter.id).map((lesson) => (
                <li key={lesson.id}>
                  {lesson.ready ? (
                    <AppLink
                      href={lessonHref(lesson.id)}
                      transitionTypes={NAV_FORWARD}
                    >
                      {lessonCode(lesson.id)} {lesson.title}
                    </AppLink>
                  ) : (
                    <span className="text-fg-muted">
                      {lessonCode(lesson.id)} {lesson.title} (being written)
                    </span>
                  )}{" "}
                  <span className="text-sm text-fg-muted">
                    · {lesson.minutes} min
                  </span>
                </li>
              ))}
            </ol>
            {CAPSTONES[chapter.id] ? (
              <p className="m-0">
                Already know this?{" "}
                <AppLink
                  href={capstoneHref(chapter.id)}
                  transitionTypes={NAV_FORWARD}
                >
                  Do the {chapterCode(chapter.id)} capstone
                </AppLink>
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {scenariosOf(track.id).length ? (
        <section aria-labelledby="scenarios" className="mt-10">
          <h2 id="scenarios" className="m-0 text-2xl font-bold">
            Scenarios
          </h2>
          <p className="mt-3 max-w-prose">
            Team situations that mix the chapters. There is no single right
            answer: any good end state resolves one, and the debrief shows how
            others would have gone.
          </p>
          <ul className="m-0 grid list-none gap-1 p-0">
            {scenariosOf(track.id).map((scenario) => (
              <li key={scenario.id}>
                {scenario.ready ? (
                  <AppLink
                    href={scenarioHref(scenario.id)}
                    transitionTypes={NAV_FORWARD}
                  >
                    {scenarioCode(scenario.id)} {scenario.title}
                  </AppLink>
                ) : (
                  <span className="text-fg-muted">
                    {scenarioCode(scenario.id)} {scenario.title} (being written)
                  </span>
                )}{" "}
                <span className="text-sm text-fg-muted">
                  · {scenario.minutes} min
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
