import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/content/orientation.mdx";
import { lessonHref } from "@/content/routes";
import { recipeSiteBranched } from "@/content/worlds/recipe-site";
import { LessonSandboxProvider } from "@/features/lesson/lesson-sandbox";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { buttonClass } from "@/ui/button";

export const metadata: Metadata = {
  title: "Orientation",
  description:
    "How the stage works in two minutes: the graph, scrolling and scrubbing, dragging labels, the terminal and the chips.",
};

export default function OrientationPage() {
  return (
    <LessonSandboxProvider
      value={{ sessionKey: "orientation", world: recipeSiteBranched }}
    >
      <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <header className="max-w-prose">
          <p className="m-0 font-display text-sm font-semibold text-fg-muted">
            2 min · before B1.1
          </p>
          <h1 className="m-0 mt-2 text-3xl font-bold">Orientation</h1>
          <p className="mt-3">How the stage works, in two minutes.</p>
        </header>
        <div className="max-w-prose">
          <Prose />
        </div>
        <Link
          href={lessonHref("b1-1")}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("primary")}
        >
          Start B1.1
        </Link>
      </article>
    </LessonSandboxProvider>
  );
}
