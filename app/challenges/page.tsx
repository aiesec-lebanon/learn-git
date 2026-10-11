import type { Metadata } from "next";
import { Suspense } from "react";
import { puzzlesOf } from "@/content/puzzles";
import { chapterCode, chaptersOf, lessonCode } from "@/content/registry";
import { puzzleHref } from "@/content/routes";
import {
  PuzzleList,
  type PuzzleChapter,
} from "@/features/challenge/puzzle-list";
import { AppLink } from "@/ui/link";

export const metadata: Metadata = {
  title: "Puzzles",
  description:
    "Optional puzzles for each lesson: reach a target repository in as few steps as you can.",
};

const chapters: readonly PuzzleChapter[] = chaptersOf("beginner").map(
  (chapter) => ({
    id: chapter.id,
    title: `${chapterCode(chapter.id)} ${chapter.title}`,
    puzzles: puzzlesOf(chapter.id).map(({ lesson, challenge }) => ({
      id: lesson.id,
      title: `${lessonCode(lesson.id)} ${lesson.title}`,
      href: puzzleHref(lesson.id),
      goal: challenge.goal,
      par: challenge.par,
    })),
  }),
);

const off = (
  <p className="m-0 max-w-prose">
    Puzzles are part of challenge mode, which is off. Turn it on in{" "}
    <AppLink href="/settings">Settings</AppLink> to add a puzzle to the end of
    each lesson: reach a target state in as few steps as you can.
  </p>
);

export default function ChallengesPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="m-0 mb-8 text-3xl font-bold">Puzzles</h1>
      <Suspense fallback={off}>
        <PuzzleList chapters={chapters} off={off} />
      </Suspense>
    </div>
  );
}
