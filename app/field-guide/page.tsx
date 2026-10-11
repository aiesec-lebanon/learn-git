import type { Metadata } from "next";
import type { ComponentProps, ReactElement } from "react";
import Prose from "@/content/field-guide.mdx";
import { ExternalLink } from "@/ui/link";

export const metadata: Metadata = {
  title: "Field guide",
  description:
    "Set up Git on your own computer: install it, tell it who you are, pick an editor and sign in to GitHub.",
};

/** A fenced block: the commands, one per line, in the terminal's colours. */
function CodeBlock({ children }: ComponentProps<"pre">) {
  const code = children as ReactElement<{ children?: string }>;
  return (
    <pre className="overflow-x-auto rounded-sm bg-term-bg p-3 font-mono text-sm text-term-fg">
      <code>{code.props.children}</code>
    </pre>
  );
}

const FONTS = [
  ["Shantell Sans", "https://github.com/arrowtype/shantell-sans"],
  ["Figtree", "https://github.com/erikdkennedy/figtree"],
  ["JetBrains Mono", "https://github.com/JetBrains/JetBrainsMono"],
] as const;

export default function FieldGuidePage() {
  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-prose">
        <h1 className="m-0 text-3xl font-bold">Field guide</h1>
        <p className="mt-3">
          The lessons run in a sandbox. This page sets up Git on your own
          computer so the same commands work there. Last checked in October
          2026, against Git 2.45 and 2.46.
        </p>
      </header>
      <div className="max-w-prose [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:my-2 [&_p]:my-3 [&_ul]:pl-5">
        <Prose components={{ pre: CodeBlock }} />
      </div>
      <section aria-labelledby="credits" className="mt-12 max-w-prose">
        <h2 id="credits" className="m-0 text-2xl font-bold">
          Credits
        </h2>
        <p className="my-3">
          Learn Git is made by AIESEC Lebanon and is open source under the MIT
          License.
        </p>
        <p className="my-3">
          Fonts, each under the SIL Open Font License 1.1:{" "}
          {FONTS.map(([name, href], i) => (
            <span key={name}>
              {i ? ", " : null}
              <ExternalLink href={href}>{name}</ExternalLink>
            </span>
          ))}
          .
        </p>
        <p className="my-3">
          Git and the Git logo are either registered trademarks or trademarks of
          Software Freedom Conservancy, Inc., corporate home of the Git Project,
          in the United States and/or other countries. GitHub is a trademark of
          GitHub, Inc. Learn Git is not affiliated with GitHub, and its Hub is a
          simulation.
        </p>
        <p className="my-3">
          Privacy: your progress stays in this browser. The host keeps standard
          request logs.
        </p>
      </section>
    </article>
  );
}
