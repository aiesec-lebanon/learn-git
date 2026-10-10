import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MDXContent } from "mdx/types";
import { SCENES } from "@/content/lessons";
import {
  CHAPTERS,
  lessonById,
  lessonCode,
  readyLessons,
} from "@/content/registry";
import { beatFrames } from "@/features/lesson/frames";
import { LessonScroller } from "@/features/lesson/scroller";

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

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-prose">
        <p className="m-0 font-display text-sm font-semibold text-fg-muted">
          Beginner · {chapter?.title} · {lesson.minutes} min
        </p>
        <h1 className="m-0 mt-2 text-3xl font-bold">
          {lessonCode(lesson.id)} {lesson.title}
        </h1>
      </header>
      <LessonScroller frames={beatFrames(scene)}>
        <Prose />
      </LessonScroller>
    </article>
  );
}
