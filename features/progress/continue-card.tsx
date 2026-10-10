"use client";

import Link from "next/link";
import type { Route } from "next";
import { use } from "react";
import { browser } from "react-dom";
import { lessonById, lessonCode } from "@/content/registry";
import { lessonHref } from "@/content/routes";
import { buttonClass } from "@/ui/button";
import { useProgress } from "./progress";

/** "Continue where you left off": opens the lesson at the stored beat. */
export function ContinueCard() {
  use(browser("Progress lives in localStorage."));
  const { resume } = useProgress();
  const lesson = resume ? lessonById(resume.id) : undefined;
  if (!resume || !lesson) return null;
  return (
    <section
      aria-labelledby="continue"
      className="grid justify-items-start gap-2 rounded-sm border border-line bg-surface p-4 shadow-2"
    >
      <h2 id="continue" className="m-0 text-xl font-bold">
        Continue where you left off
      </h2>
      <p className="m-0">
        {lessonCode(lesson.id)} {lesson.title}
      </p>
      <Link
        href={`${lessonHref(lesson.id)}#step-${resume.step}` as Route}
        className={buttonClass("primary")}
      >
        Continue
      </Link>
    </section>
  );
}
