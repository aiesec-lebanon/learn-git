"use client";

import { use } from "react";
import { browser } from "react-dom";
import { challengesHref } from "@/content/routes";
import { useProgress } from "@/features/progress/progress";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { AppLink } from "@/ui/link";

/** The way to the Puzzles page, shown only while challenge mode is on. */
export function PuzzlesLink() {
  use(browser("Challenge mode lives in localStorage."));
  if (!useProgress().prefs.challengeMode) return null;
  return (
    <p className="m-0">
      <AppLink href={challengesHref} transitionTypes={NAV_FORWARD}>
        All puzzles by chapter
      </AppLink>
    </p>
  );
}
