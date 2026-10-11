import Link from "next/link";
import { Suspense } from "react";
import {
  chaptersOf,
  lessonsOfTrack,
  readyScenarios,
  TRACKS,
  type TrackId,
} from "@/content/registry";
import { orientationHref, startHref, trackHref } from "@/content/routes";
import { heroFilm } from "@/features/hero/film";
import { HeroPlayer } from "@/features/hero/player";
import { ContinueCard } from "@/features/progress/continue-card";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { copy } from "@/themes/active";
import { buttonClass } from "@/ui/button";
import { AppLink } from "@/ui/link";

function trackStats(track: TrackId) {
  const lessons = lessonsOfTrack(track);
  const hours = Math.round(
    lessons.reduce((sum, lesson) => sum + lesson.minutes, 0) / 60,
  );
  const scenarios = readyScenarios().filter((s) => s.track === track).length;
  return `${chaptersOf(track).length} chapters · ${lessons.length} lessons · ${scenarios} scenarios · about ${hours} h of lessons`;
}

const isOpen = (track: TrackId) =>
  lessonsOfTrack(track).some((lesson) => lesson.ready);

const OPEN = TRACKS.filter((track) => isOpen(track.id));

const COMING = [
  ...TRACKS.filter((track) => !isOpen(track.id)),
  {
    title: "Pro",
    summary:
      "Under the hood: objects and refs, advanced merging, bisect, worktrees and automation.",
  },
];

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

      <div className="mt-12">
        <HeroPlayer frames={heroFilm()} />
      </div>

      <section aria-labelledby="tracks" className="mt-16">
        <h2 id="tracks" className="m-0 text-2xl font-bold">
          Tracks
        </h2>
        <ul className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
          {OPEN.map((track) => (
            <li
              key={track.id}
              className="grid content-start gap-2 rounded-sm border border-line bg-surface p-5 shadow-2"
            >
              <h3 className="m-0 text-xl font-bold">
                <AppLink
                  href={trackHref(track.id)}
                  transitionTypes={NAV_FORWARD}
                >
                  {track.title}
                </AppLink>
              </h3>
              <p className="m-0">{track.summary}</p>
              <p className="m-0 text-sm text-fg-muted">
                {trackStats(track.id)}
              </p>
            </li>
          ))}
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
