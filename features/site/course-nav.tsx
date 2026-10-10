import type { Route } from "next";
import { neighbours } from "@/content/course";
import { trackHref } from "@/content/routes";
import type { TrackId } from "@/content/registry";
import { AppLink } from "@/ui/link";
import { NAV_BACK, NAV_FORWARD } from "./page-transition";

/** Previous and next pages of the track, and the way back to its overview. */
export function CourseNav({ track, here }: { track: TrackId; here: Route }) {
  const { previous, next } = neighbours(track, here);
  return (
    <nav
      aria-label="Course"
      className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line py-6"
    >
      {previous ? (
        <AppLink href={previous.href} transitionTypes={NAV_BACK}>
          Previous: {previous.label}
        </AppLink>
      ) : null}
      {next ? (
        <AppLink href={next.href} transitionTypes={NAV_FORWARD}>
          Next: {next.label}
        </AppLink>
      ) : null}
      <AppLink
        href={trackHref(track)}
        transitionTypes={NAV_BACK}
        className="sm:ml-auto"
      >
        All chapters
      </AppLink>
    </nav>
  );
}
