"use client";

import type { Route } from "next";
import { use, type ReactNode } from "react";
import { browser } from "react-dom";
import { useProgress } from "@/features/progress/progress";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { AppLink } from "@/ui/link";

export type PuzzleChapter = {
  readonly id: string;
  readonly title: string;
  readonly puzzles: readonly {
    readonly id: string;
    readonly title: string;
    readonly href: Route;
    readonly goal: string;
    readonly par: number;
  }[];
};

/** Every puzzle by chapter while challenge mode is on; otherwise how to turn it on. */
export function PuzzleList({
  chapters,
  off,
}: {
  chapters: readonly PuzzleChapter[];
  off: ReactNode;
}) {
  use(browser("Challenge mode lives in localStorage."));
  if (!useProgress().prefs.challengeMode) return off;
  return (
    <ol className="m-0 grid list-none gap-6 p-0">
      {chapters.map((chapter) => (
        <li
          key={chapter.id}
          className="grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-2 sm:p-6"
        >
          <h2 className="m-0 text-xl font-bold">{chapter.title}</h2>
          <ol className="m-0 grid list-none gap-4 p-0">
            {chapter.puzzles.map((puzzle) => (
              <li key={puzzle.id} className="grid gap-1">
                <AppLink
                  href={puzzle.href}
                  transitionTypes={NAV_FORWARD}
                  className="font-semibold"
                >
                  {puzzle.title}
                </AppLink>
                <p className="m-0 max-w-prose">{puzzle.goal}</p>
                <p className="m-0 text-sm text-fg-muted">Par {puzzle.par}</p>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
