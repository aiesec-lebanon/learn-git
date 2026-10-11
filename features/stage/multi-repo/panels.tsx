"use client";

import { useState } from "react";
import { CommitGraph } from "@/features/graph/graph";
import type { Layout } from "@/features/graph/layout";
import { Area } from "../area";
import type { PanelCommit, RepoPanel } from "./model";

const SHOWN = 3;

/** Which commits only this panel has: your repository needs a fetch or pull to see them. */
function OnlyHere({
  title,
  commits,
}: {
  title: string;
  commits: readonly PanelCommit[];
}) {
  if (!commits.length) return null;
  const newest = commits.slice(-SHOWN).reverse();
  const more = commits.length - newest.length;
  return (
    <p className="m-0 mt-2 rounded-sm border-2 border-dashed border-accent bg-accent-soft p-2 text-sm">
      <strong>Only on {title} so far:</strong>{" "}
      {newest.map((c, i) => (
        <span key={c.oid}>
          {i ? "; " : ""}
          <code className="font-mono">{c.short}</code> {c.subject}
        </span>
      ))}
      {more ? `; and ${more} more` : ""}. A fetch or pull brings{" "}
      {commits.length === 1 ? "it" : "them"} into your repository.
    </p>
  );
}

const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 text-sm font-semibold aria-pressed:border-accent aria-pressed:bg-accent-soft";

/**
 * The other repositories (origin on the Hub, teammates' clones), each with
 * its own graph: origin's branches are solid labels; your clone shows its
 * `origin/*` labels hollow. On phones one panel shows at a time.
 */
export function RepoPanels({
  panels,
  layouts,
}: {
  panels: readonly RepoPanel[];
  layouts: ReadonlyMap<string, Layout>;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  if (!panels.length) return null;
  const shown = panels.find((p) => p.id === picked) ?? panels[0];
  return (
    <div className="grid gap-3">
      {panels.length > 1 ? (
        <div
          className="flex flex-wrap gap-2 sm:hidden"
          role="group"
          aria-label="Repository to show"
        >
          {panels.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p === shown}
              onClick={() => setPicked(p.id)}
              className={chip}
            >
              {p.title}
            </button>
          ))}
        </div>
      ) : null}
      {panels.map((p) => {
        const layout = layouts.get(p.id);
        return (
          <div
            key={p.id}
            data-panel={p.role}
            className={p === shown ? undefined : "max-sm:hidden"}
          >
            <Area title={p.title} hint={p.where}>
              {layout ? (
                <CommitGraph
                  view={p.view}
                  layout={layout}
                  label={`${p.title} (${p.where})`}
                  scope={p.scope}
                  highlight={
                    p.onlyHere.length
                      ? {
                          kind: "reach",
                          oids: new Set(p.onlyHere.map((c) => c.oid)),
                        }
                      : null
                  }
                />
              ) : null}
              <OnlyHere title={p.title} commits={p.onlyHere} />
            </Area>
          </div>
        );
      })}
    </div>
  );
}
