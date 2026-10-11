"use client";

import Link from "next/link";
import type { Route } from "next";
import { use } from "react";
import { browser } from "react-dom";
import {
  lessonById,
  lessonCode,
  scenarioById,
  scenarioCode,
} from "@/content/registry";
import { lessonHref, scenarioHref } from "@/content/routes";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { buttonClass } from "@/ui/button";
import { useProgress } from "./progress";
import type { ResumePointer } from "./schema";

/** Where the pointer leads: a lesson at the stored beat, or a scenario (which offers its stored act). */
function destination(resume: ResumePointer) {
  if (resume.kind === "scenario") {
    const scenario = scenarioById(resume.id);
    return scenario?.ready
      ? {
          label: `${scenarioCode(scenario.id)} ${scenario.title}`,
          href: scenarioHref(scenario.id),
        }
      : null;
  }
  const lesson = lessonById(resume.id);
  return lesson
    ? {
        label: `${lessonCode(lesson.id)} ${lesson.title}`,
        href: `${lessonHref(lesson.id)}#step-${resume.step}` as Route,
      }
    : null;
}

/** "Continue where you left off". */
export function ContinueCard() {
  use(browser("Progress lives in localStorage."));
  const { resume } = useProgress();
  const to = resume ? destination(resume) : null;
  if (!to) return null;
  return (
    <section
      aria-labelledby="continue"
      className="grid justify-items-start gap-2 rounded-sm border border-line bg-surface p-4 shadow-2"
    >
      <h2 id="continue" className="m-0 text-xl font-bold">
        Continue where you left off
      </h2>
      <p className="m-0">{to.label}</p>
      <Link
        href={to.href}
        transitionTypes={NAV_FORWARD}
        className={buttonClass("primary")}
      >
        Continue
      </Link>
    </section>
  );
}
