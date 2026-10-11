import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { stepText } from "@/content/define";
import { lessonById, lessonCode } from "@/content/registry";
import { REFERENCE, referenceById } from "@/content/reference/registry";
import { lessonHref } from "@/content/routes";
import { EntryView } from "@/features/reference/entry-view";
import { entryFrames } from "@/features/reference/frames";
import { NAV_BACK } from "@/features/site/page-transition";
import { cx } from "@/lib/cx";
import { AppLink } from "@/ui/link";

export function generateStaticParams() {
  return REFERENCE.map((entry) => ({ entryId: entry.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/reference/[entryId]">): Promise<Metadata> {
  const entry = referenceById((await params).entryId);
  return entry ? { title: entry.title, description: entry.summary } : {};
}

export default async function ReferenceEntryPage({
  params,
}: PageProps<"/reference/[entryId]">) {
  const entry = referenceById((await params).entryId);
  if (!entry) notFound();
  const lessons = entry.lessons.flatMap((id) => {
    const lesson = lessonById(id);
    return lesson?.ready ? [lesson] : [];
  });
  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-prose">
        <p className="m-0 font-display text-sm font-semibold text-fg-muted">
          <AppLink href="/reference" transitionTypes={NAV_BACK}>
            Reference
          </AppLink>
        </p>
        <h1
          className={cx(
            "m-0 mt-2 text-3xl font-bold",
            !entry.hub && "font-mono",
          )}
        >
          {entry.title}
        </h1>
        <p className="mt-3 mb-0 text-lg">{entry.summary}</p>
      </header>
      <EntryView
        presets={entry.presets.map(({ id, label }) => ({ id, label }))}
        variants={entry.variants.map(({ id, command, label }) => ({
          id,
          command,
          label: label ?? stepText(command),
        }))}
        frames={entryFrames(entry)}
        hub={entry.hub ?? false}
      />
      <div className="mt-10 grid max-w-prose gap-8">
        <section aria-labelledby="gotchas">
          <h2 id="gotchas" className="m-0 text-2xl font-bold">
            Gotchas
          </h2>
          <ul className="mt-3 mb-0 grid gap-2 pl-5">
            {entry.gotchas.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
        {entry.legacy?.length ? (
          <section aria-labelledby="legacy">
            <h2 id="legacy" className="m-0 text-2xl font-bold">
              Older forms
            </h2>
            <dl className="mt-3 mb-0 grid gap-2">
              {entry.legacy.map(({ older, today }) => (
                <div key={older}>
                  <dt>
                    <code className="font-mono">{older}</code>
                  </dt>
                  <dd className="m-0 text-fg-muted">
                    Today: <code className="font-mono">{today}</code>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {lessons.length ? (
          <section aria-labelledby="lessons">
            <h2 id="lessons" className="m-0 text-2xl font-bold">
              Learn it in
            </h2>
            <ul className="mt-3 mb-0 grid gap-1 pl-5">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <AppLink href={lessonHref(lesson.id)}>
                    {lessonCode(lesson.id)} {lesson.title}
                  </AppLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
