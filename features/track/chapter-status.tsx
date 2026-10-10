"use client";

import Link from "next/link";
import type { Route } from "next";
import { use } from "react";
import { browser } from "react-dom";
import { lessonById, type ChapterId } from "@/content/registry";
import { lessonHref } from "@/content/routes";
import { useProgress } from "@/features/progress/progress";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { buttonClass } from "@/ui/button";

/** A chapter's check mark when finished, and Continue when the resume point is in it. */
export function ChapterStatus({ chapter }: { chapter: ChapterId }) {
  use(browser("Progress lives in localStorage."));
  const { finished, resume } = useProgress();
  const lesson = resume ? lessonById(resume.id) : undefined;
  const done = finished.includes(chapter);
  const here = resume && lesson?.chapter === chapter ? resume : null;
  if (!done && !here) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {done ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-accent-ink">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 10.5l4 4 8-9" />
          </svg>
          Finished
        </span>
      ) : null}
      {here && lesson ? (
        <Link
          href={`${lessonHref(lesson.id)}#step-${here.step}` as Route}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("primary")}
        >
          Continue
        </Link>
      ) : null}
    </div>
  );
}
