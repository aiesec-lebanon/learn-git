"use client";

import { useId, useMemo, useState } from "react";
import type { Session } from "@/engine";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { useSession } from "@/features/stage/use-session";
import { lensSections, type LensSection, type Zone } from "./status-lens.model";

const ZONES: readonly { id: Zone; title: string }[] = [
  { id: "worktree", title: "Working tree" },
  { id: "index", title: "Staging area" },
  { id: "head", title: "Last commit" },
];

/** Pick a `git status` section to light up the zones it compares, using your Your turn sandbox. */
export function StatusLens() {
  const session = useLessonSession();
  return session ? <StatusLensFor session={session} /> : null;
}

function StatusLensFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const sections = useMemo(() => lensSections(world), [world]);
  const [chosen, setChosen] = useState<LensSection["id"]>("unstaged");
  const name = useId();
  if (!sections) return null;
  const section = sections.find((s) => s.id === chosen) ?? sections[0];
  if (!section) return null;

  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <fieldset className="m-0 grid gap-1 border-0 p-0">
        <legend className="mb-1 font-display font-bold">
          git status sections in your sandbox
        </legend>
        {sections.map((s) => (
          <label
            key={s.id}
            className="flex min-h-11 cursor-pointer items-center gap-2"
          >
            <input
              type="radio"
              name={name}
              value={s.id}
              checked={s.id === section.id}
              onChange={() => setChosen(s.id)}
              className="size-5 accent-accent"
            />
            {s.heading} ({s.files.length})
          </label>
        ))}
      </fieldset>
      <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {ZONES.map((zone) => {
          const lit = section.zones.includes(zone.id);
          return (
            <li
              key={zone.id}
              className={`grid min-h-16 content-center rounded-sm border-2 p-2 text-center text-sm font-semibold ${lit ? "border-accent bg-accent-soft" : "border-dashed border-line text-fg-muted"}`}
            >
              {zone.title}
              <span className="text-xs font-normal">
                {lit ? (section.zones.length > 1 ? "compared" : "listed") : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <figcaption className="grid gap-1 text-sm">
        <span>{section.meaning}</span>
        {section.files.length ? (
          <ul className="m-0 grid list-none gap-0.5 rounded-sm bg-term-bg p-3 font-mono text-term-fg">
            {section.files.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : (
          <span className="text-fg-muted">Nothing in this section now.</span>
        )}
      </figcaption>
    </figure>
  );
}
