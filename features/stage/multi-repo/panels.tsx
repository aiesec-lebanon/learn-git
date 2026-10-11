"use client";

import { useState } from "react";
import { CommitGraph } from "@/features/graph/graph";
import type { Layout } from "@/features/graph/layout";
import { Area } from "../area";
import type { RepoPanel } from "./model";

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
                />
              ) : null}
            </Area>
          </div>
        );
      })}
    </div>
  );
}
