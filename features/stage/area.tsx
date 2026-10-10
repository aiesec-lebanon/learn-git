import { useId, type ReactNode } from "react";

/** One of the stage's three areas: a titled card. */
export function Area({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="relative min-w-0 rounded-sm border border-line bg-surface p-3 shadow-2"
    >
      <h3 id={id} className="m-0 mb-2 font-display text-base font-bold">
        {title}
        {hint ? (
          <span className="ml-2 text-xs font-normal text-fg-muted">{hint}</span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}
