"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { CAPSTONES } from "@/content/capstones";
import { chapterById, chapterCode, lessonsOf } from "@/content/registry";
import { capstoneHref, lessonHref } from "@/content/routes";
import { SELF_CHECK, suggest, type Suggestion } from "@/content/self-check";
import { useAnnounce } from "@/features/announcer/announcer";
import { progressStore, useProgress } from "@/features/progress/progress";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { buttonClass } from "@/ui/button";
import { AppLink } from "@/ui/link";

function Statements({
  ticked,
  onToggle,
}: {
  ticked: ReadonlySet<string>;
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <div className="grid gap-8">
      {SELF_CHECK.map(({ track, statements }) => (
        <fieldset key={track} className="m-0 grid gap-1 border-0 p-0">
          <legend className="mb-2 p-0 font-display text-xl font-bold">
            {track}
          </legend>
          {statements.map(({ id, text }) => (
            <label
              key={id}
              className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5"
            >
              <input
                type="checkbox"
                checked={ticked.has(id)}
                onChange={(event) => onToggle(id, event.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-accent-fill"
              />
              {text}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function headline(suggestion: Suggestion): string {
  if (suggestion.kind === "everything") return "You ticked everything";
  if (suggestion.kind === "coming-next")
    return "Next: the Intermediate and Pro tracks";
  const chapter = chapterById(suggestion.chapter);
  return `Suggested: ${chapterCode(suggestion.chapter)} ${chapter?.title ?? ""}`;
}

const MORE = (
  <p className="m-0 max-w-prose">
    The next tracks are coming next. Until then, try anything in the{" "}
    <AppLink href="/playground">playground</AppLink> and look commands up in the{" "}
    <AppLink href="/reference">reference</AppLink>.
  </p>
);

function Advice({ suggestion }: { suggestion: Suggestion }) {
  if (suggestion.kind !== "chapter") return MORE;
  const first = lessonsOf(suggestion.chapter)[0];
  const capstone = CAPSTONES[suggestion.chapter];
  return (
    <div className="flex flex-wrap gap-3">
      {first ? (
        <Link
          href={lessonHref(first.id)}
          transitionTypes={NAV_FORWARD}
          onClick={() =>
            progressStore().setResume({ kind: "lesson", id: first.id, step: 0 })
          }
          className={buttonClass("primary")}
        >
          Start there
        </Link>
      ) : null}
      {capstone ? (
        <Link
          href={capstoneHref(suggestion.chapter)}
          transitionTypes={NAV_FORWARD}
          className={buttonClass("secondary")}
        >
          Prove it instead
        </Link>
      ) : null}
    </div>
  );
}

/** "What can you already do?": ticks stay on this page; only "Start there" stores where to resume. */
export function SelfCheck({ finished }: { finished: readonly string[] }) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const suggestion = suggest(ticked, finished);
  const title = headline(suggestion);
  const say = useAnnounce();
  const said = useRef(title);
  useEffect(() => {
    if (said.current === title) return;
    said.current = title;
    say(title);
  }, [title, say]);

  const toggle = (id: string, on: boolean) =>
    setTicked((old) => {
      const next = new Set(old);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <Statements ticked={ticked} onToggle={toggle} />
      <section
        aria-labelledby="suggestion"
        className="grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-2 sm:p-6 lg:sticky lg:top-24"
      >
        <h2 id="suggestion" className="m-0 text-xl font-bold">
          {title}
        </h2>
        {"reason" in suggestion ? (
          <p className="m-0 max-w-prose">{suggestion.reason}</p>
        ) : null}
        <Advice suggestion={suggestion} />
      </section>
    </div>
  );
}

/** The self-check with finished chapters counted as ticked. */
export function SelfCheckWithProgress() {
  use(browser("Finished chapters live in localStorage."));
  return <SelfCheck finished={useProgress().finished} />;
}
