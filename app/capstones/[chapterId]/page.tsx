import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createWorld } from "@/engine";
import { CAPSTONES, readyCapstones } from "@/content/capstones";
import { chapterById, chapterCode, trackById } from "@/content/registry";
import { capstoneHref, trackHref } from "@/content/routes";
import { Checkpoint } from "@/features/checkpoint/checkpoint";
import { stageFrame } from "@/features/stage/frame";
import { CourseNav } from "@/features/site/course-nav";
import { NAV_BACK } from "@/features/site/page-transition";
import { AppLink } from "@/ui/link";

export function generateStaticParams() {
  return readyCapstones().map((capstone) => ({ chapterId: capstone.chapter }));
}

function find(id: string) {
  const chapter = chapterById(id);
  const capstone = chapter ? CAPSTONES[chapter.id] : undefined;
  return chapter && capstone ? { chapter, capstone } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/capstones/[chapterId]">): Promise<Metadata> {
  const found = find((await params).chapterId);
  return found
    ? {
        title: `Capstone ${chapterCode(found.chapter.id)}`,
        description: `Finish ${chapterCode(found.chapter.id)} ${found.chapter.title} in a sandbox: ${found.capstone.goal}`,
      }
    : {};
}

export default async function CapstonePage({
  params,
}: PageProps<"/capstones/[chapterId]">) {
  const found = find((await params).chapterId);
  if (!found) notFound();
  const { chapter, capstone } = found;
  const track = trackById(chapter.track);
  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-prose">
        <p className="m-0 font-display text-sm font-semibold text-fg-muted">
          {track ? (
            <AppLink href={trackHref(track.id)} transitionTypes={NAV_BACK}>
              {track.title}
            </AppLink>
          ) : null}{" "}
          · {chapter.title}
        </p>
        <h1 className="m-0 mt-2 text-3xl font-bold">
          Capstone {chapterCode(chapter.id)}
        </h1>
        <p className="mt-3 mb-0 font-display text-xl">{capstone.goal}</p>
        <p className="mt-3 mb-0 text-fg-muted">
          No steps this time. Reaching the target finishes the chapter.
        </p>
      </header>
      <Checkpoint
        sessionKey={`capstone:${chapter.id}`}
        reached={{ finishes: chapter.id }}
        world={capstone.world}
        target={capstone.target}
        hints={capstone.hints}
        start={stageFrame(createWorld(capstone.world), [])}
      />
      <CourseNav track={chapter.track} here={capstoneHref(chapter.id)} />
    </article>
  );
}
