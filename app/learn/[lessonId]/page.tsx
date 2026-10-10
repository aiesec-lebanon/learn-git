import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MDXContent } from "mdx/types";
import type { ComponentProps } from "react";
import { SCENES } from "@/content/lessons";
import { playgroundHref } from "@/content/playground";
import {
  CHAPTERS,
  lessonById,
  lessonCode,
  readyLessons,
} from "@/content/registry";
import { lessonHref, trackHref } from "@/content/routes";
import { YourTurn } from "@/features/checkpoint/your-turn";
import { beatFrames } from "@/features/lesson/frames";
import { LessonSandboxProvider } from "@/features/lesson/lesson-sandbox";
import { Wrap } from "@/features/lesson/content";
import { LessonScroller } from "@/features/lesson/scroller";
import { CourseNav } from "@/features/site/course-nav";
import { NAV_BACK } from "@/features/site/page-transition";
import { AppLink } from "@/ui/link";

/** The prose renders twice: the beats beside the pinned stage, then the rest. */
const Nothing = () => null;

export function generateStaticParams() {
  return readyLessons().map((lesson) => ({ lessonId: lesson.id }));
}

function find(id: string) {
  const lesson = lessonById(id);
  const scene = lesson?.ready ? SCENES[lesson.id] : undefined;
  return lesson && scene ? { lesson, scene } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[lessonId]">): Promise<Metadata> {
  const found = find((await params).lessonId);
  return found
    ? { title: `${lessonCode(found.lesson.id)} ${found.lesson.title}` }
    : {};
}

export default async function LessonPage({
  params,
}: PageProps<"/learn/[lessonId]">) {
  const found = find((await params).lessonId);
  if (!found) notFound();
  const { lesson, scene } = found;
  const chapter = CHAPTERS.find((c) => c.id === lesson.chapter);
  const { default: Prose } = (await import(
    `@/content/lessons/${lesson.id}/lesson.mdx`
  )) as { default: MDXContent };

  const sessionKey = `lesson:${lesson.id}`;
  return (
    <LessonSandboxProvider value={{ sessionKey, world: scene.yourTurn.world }}>
      <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 max-w-prose">
          <p className="m-0 font-display text-sm font-semibold text-fg-muted">
            <AppLink href={trackHref("beginner")} transitionTypes={NAV_BACK}>
              Beginner
            </AppLink>{" "}
            · {chapter?.title} · {lesson.minutes} min
          </p>
          <h1 className="m-0 mt-2 text-3xl font-bold">
            {lessonCode(lesson.id)} {lesson.title}
          </h1>
        </header>
        <LessonScroller lessonId={lesson.id} frames={beatFrames(scene)}>
          <Prose components={{ YourTurn: Nothing, Wrap: Nothing }} />
        </LessonScroller>
        <Prose
          components={{
            ColdOpen: Nothing,
            Beat: Nothing,
            Wrap: (props: ComponentProps<typeof Wrap>) => (
              <Wrap
                {...props}
                playground={playgroundHref({ prompt: lesson.id })}
              />
            ),
            YourTurn: () => (
              <YourTurn
                sessionKey={sessionKey}
                checkpoint={scene.yourTurn}
                reached={{
                  resume: {
                    kind: "lesson",
                    id: lesson.id,
                    step: scene.beats.length,
                  },
                }}
              />
            ),
          }}
        />
        <CourseNav track="beginner" here={lessonHref(lesson.id)} />
      </article>
    </LessonSandboxProvider>
  );
}
