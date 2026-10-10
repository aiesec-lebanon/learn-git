import Link from "next/link";
import { Suspense } from "react";
import { lessonHref, trackHref } from "@/content/routes";
import { ContinueCard } from "@/features/progress/continue-card";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { copy } from "@/themes/active";
import { buttonClass } from "@/ui/button";

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
          href={lessonHref("b1-1")}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("primary")}
        >
          New to Git? Start here
        </Link>
        <Link
          href={trackHref("beginner")}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("secondary")}
        >
          See the Beginner track
        </Link>
      </div>
    </div>
  );
}
