import type { Metadata } from "next";
import type { ReferenceEntry } from "@/content/define";
import { REFERENCE } from "@/content/reference/registry";
import { referenceHref } from "@/content/routes";
import { NAV_FORWARD } from "@/features/site/page-transition";
import { cx } from "@/lib/cx";
import { AppLink } from "@/ui/link";

export const metadata: Metadata = { title: "Reference" };

export default function ReferenceIndex() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="m-0 text-3xl font-bold">Reference</h1>
      <p className="mt-3 max-w-prose">
        Each command before and after, in the forms the course uses. In any
        sandbox, <code className="font-mono">git &lt;command&gt; -h</code> opens
        its entry.
      </p>
      <Entries entries={REFERENCE.filter((e) => !e.hub)} />
      <h2 className="m-0 mt-12 text-2xl font-bold">Hub cards</h2>
      <p className="mt-3 max-w-prose">
        What the simulated GitHub does when you click, and what it means for the
        repositories.
      </p>
      <Entries entries={REFERENCE.filter((e) => e.hub)} hub />
    </div>
  );
}

function Entries({
  entries,
  hub = false,
}: {
  entries: readonly ReferenceEntry[];
  hub?: boolean;
}) {
  return (
    <ul className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="grid gap-1 rounded-sm border border-line bg-surface p-4 [contain-intrinsic-size:auto_8rem] [content-visibility:auto]"
        >
          <AppLink
            href={referenceHref(entry.id)}
            transitionTypes={NAV_FORWARD}
            className={cx("text-lg font-semibold", !hub && "font-mono")}
          >
            {entry.title}
          </AppLink>
          <p className="m-0 text-sm text-fg-muted">{entry.summary}</p>
        </li>
      ))}
    </ul>
  );
}
