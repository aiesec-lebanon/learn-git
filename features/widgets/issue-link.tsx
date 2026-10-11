"use client";

import { useId, useState } from "react";
import type { Session } from "@/engine";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { cx } from "@/lib/cx";
import {
  linkLines,
  segments,
  wouldClose,
  type LinkLine,
} from "./issue-link.model";

const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 text-sm font-semibold aria-pressed:border-accent aria-pressed:bg-accent-soft";

const SAMPLE = "The menu link now points to menu.html.\n\nFixes #3";
const BASES = ["main", "docs"] as const;

/** Type a description and see which references close issues, and into which branch (B6.3). */
export function KeywordHighlighter() {
  const [text, setText] = useState(SAMPLE);
  const [base, setBase] = useState<(typeof BASES)[number]>("main");
  const id = useId();
  const closes = wouldClose(text, base, "main");
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Edit the pull request description. Closing references are highlighted; a
        plain number is only a mention.
      </figcaption>
      <label htmlFor={id} className="text-sm font-semibold">
        Description
      </label>
      <textarea
        id={id}
        value={text}
        maxLength={500}
        rows={4}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-sm border-2 border-line-strong bg-bg p-2 font-mono text-sm"
      />
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Base branch"
      >
        {BASES.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={base === b}
            onClick={() => setBase(b)}
            className={chip}
          >
            Into {b}
          </button>
        ))}
      </div>
      <p className="m-0 whitespace-pre-wrap rounded-sm bg-sunk p-2 text-sm">
        {segments(text).map((s, i) =>
          s.kind === "closes" ? (
            <mark
              key={i}
              className="rounded-xs bg-hl px-0.5 font-semibold text-fg"
            >
              {s.text}
            </mark>
          ) : s.kind === "mention" ? (
            <span key={i} className="underline decoration-dotted">
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      <output className="grid min-h-11 content-center text-sm">
        {closes.length
          ? `Merging into ${base} closes ${closes.map((n) => `#${n}`).join(", ")}.`
          : base !== "main" && wouldClose(text, "main", "main").length
            ? `Into ${base}, nothing closes: keywords count only into the default branch, main.`
            : "Merging closes nothing: there is no closing keyword before a number."}
      </output>
    </figure>
  );
}

const LINE: Record<LinkLine["status"], string> = {
  closed: "border-solid border-accent",
  pending: "border-dashed border-line-strong",
  inert: "border-dotted border-line",
};

function sentence(l: LinkLine): string {
  if (l.status === "closed")
    return `#${l.pull.number} merged into ${l.pull.base} and closed #${l.issue.number}.`;
  if (l.status === "inert")
    return `#${l.pull.number} targets ${l.pull.base}, so merging it leaves #${l.issue.number} ${l.issue.state}.`;
  return `Merging #${l.pull.number} into main will close #${l.issue.number}.`;
}

/** Each issue a pull request names with a closing keyword, joined by a line that holds only after a merge into the default branch (B6.3). */
export function IssueLink() {
  const session = useLessonSession();
  return session ? <IssueLinkFor session={session} /> : null;
}

function IssueLinkFor({ session }: { session: Session }) {
  const { world, view } = useSandboxView(session);
  const repo = view ? world.repos.get(view.id) : undefined;
  if (!repo) return null;
  const lines = linkLines(world, repo);
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Issues and the pull requests that name them with a closing keyword. A
        solid line means the merge closed the issue.
      </figcaption>
      {lines.length ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {lines.map((l) => (
            <li
              key={`${l.issue.number}-${l.pull.number}`}
              className="grid gap-1"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0 rounded-sm border-2 border-line-strong px-2 py-1">
                  Issue #{l.issue.number} ({l.issue.state})
                </span>
                <span
                  aria-hidden
                  className={cx("min-w-6 flex-1 border-t-4", LINE[l.status])}
                />
                <span className="shrink-0 rounded-sm border-2 border-line-strong px-2 py-1">
                  #{l.pull.number} into <bdi>{l.pull.base}</bdi>
                </span>
              </div>
              <p className="m-0 text-sm">{sentence(l)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          No pull request names an issue with a closing keyword yet.
        </p>
      )}
    </figure>
  );
}
