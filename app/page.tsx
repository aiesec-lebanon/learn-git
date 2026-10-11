import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { chaptersOf, LESSONS, readyScenarios } from "@/content/registry";
import { orientationHref, trackHref } from "@/content/routes";
import { ContinueCard } from "@/features/progress/continue-card";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { copy } from "@/themes/active";
import { buttonClass } from "@/ui/button";
import { AppLink } from "@/ui/link";

const startHref: Route = "/start";

const beginnerHours = Math.round(
  LESSONS.reduce((sum, lesson) => sum + lesson.minutes, 0) / 60,
);

const COMING = [
  {
    title: "Intermediate",
    summary:
      "Rewrite history safely: amend, reset, revert, rebase, stash, forks and reviews.",
  },
  {
    title: "Pro",
    summary:
      "Under the hood: objects and refs, advanced merging, bisect, worktrees and automation.",
  },
] as const;

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-display font-extrabold tracking-tight">Learn Git</h1>
      <p className="mt-4 font-display text-2xl text-fg-muted">{copy.tagline}</p>
      <p className="mt-8 max-w-prose">
        Learn Git and GitHub at the whiteboard: every command you run is drawn
        as it happens and explained in plain words, in a playground you
        can&apos;t break.
      </p>
      <div className="mt-8 max-w-md empty:hidden">
        <Suspense fallback={null}>
          <ContinueCard />
        </Suspense>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={orientationHref}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("primary")}
        >
          New to Git? Start here
        </Link>
        <Link
          href={startHref}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("secondary")}
        >
          What can you already do?
        </Link>
      </div>

      <section aria-labelledby="tracks" className="mt-16">
        <h2 id="tracks" className="m-0 text-2xl font-bold">
          Tracks
        </h2>
        <ul className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
          <li className="grid content-start gap-2 rounded-sm border border-line bg-surface p-5 shadow-2">
            <h3 className="m-0 text-xl font-bold">
              <AppLink
                href={trackHref("beginner")}
                transitionTypes={NAV_FORWARD}
              >
                Beginner
              </AppLink>
            </h3>
            <p className="m-0">
              Snapshots, branches, merging, remotes and the GitHub flow.
            </p>
            <p className="m-0 text-sm text-fg-muted">
              {chaptersOf("beginner").length} chapters · {LESSONS.length}{" "}
              lessons · {readyScenarios().length} scenarios · about{" "}
              {beginnerHours} h of lessons
            </p>
          </li>
          {COMING.map((track) => (
            <li
              key={track.title}
              className="grid content-start gap-2 rounded-sm border border-dashed border-line-strong p-5"
            >
              <h3 className="m-0 text-xl font-bold">{track.title}</h3>
              <p className="m-0">{track.summary}</p>
              <p className="m-0 text-sm text-fg-muted">Coming next</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
