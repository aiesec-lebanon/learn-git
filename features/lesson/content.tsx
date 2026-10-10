import type { ReactNode } from "react";

/** The opening situation and its question (learning design 1.5). */
export function ColdOpen({ children }: { children: ReactNode }) {
  return (
    <div className="mb-10 rounded-sm bg-accent-soft p-5 font-display text-xl/[1.4] font-semibold [&_p]:m-0">
      {children}
    </div>
  );
}

export const beatHeadingId = (id: string) => `beat-${id}`;

/** One story beat; the scroller finds it by `data-beat` and focuses its heading. */
export function Beat({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      data-beat={id}
      aria-labelledby={beatHeadingId(id)}
      className="py-8 [&_p]:my-3"
    >
      <h2
        id={beatHeadingId(id)}
        tabIndex={-1}
        className="m-0 scroll-mt-[calc(45dvh+5rem)] text-2xl font-bold md:scroll-mt-24"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The takeaway and the commands the lesson used. */
export function Wrap({
  commands,
  children,
}: {
  commands: readonly string[];
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="wrap" className="py-8 [&_p]:my-3">
      <h2 id="wrap" className="m-0 text-2xl font-bold">
        Wrap
      </h2>
      {children}
      <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
        {commands.map((command) => (
          <li
            key={command}
            className="rounded-sm border border-line bg-surface px-3 py-2 font-mono text-sm shadow-1"
          >
            {command}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A Git term at the point the lesson introduces it. */
export function Term({ children }: { children: ReactNode }) {
  return (
    <dfn className="bg-[linear-gradient(transparent_60%,var(--hl)_60%)] font-semibold not-italic">
      {children}
    </dfn>
  );
}

/** A command or path, set in the monospaced face. */
export function Cmd({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-xs bg-sunk px-1 py-0.5 font-mono text-sm">
      {children}
    </code>
  );
}
