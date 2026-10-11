"use client";

import { useState } from "react";
import { previewMerge, shellQuote, type Session, type World } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import type { RepoView } from "@/features/graph/view-model";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { broughtIn, outcomeText, type MergeNames } from "./merge-preview.model";

export const chip =
  "inline-flex min-h-11 items-center rounded-sm border-2 border-line-strong bg-surface px-3 font-mono text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft";

/** The branch HEAD is on and the other branches it could merge. */
export function mergeCandidates(view: RepoView) {
  const branch = view.head.kind === "branch" ? view.head.branch : null;
  const others = view.labels.filter(
    (l) => l.kind === "branch" && l.name !== branch,
  );
  return { branch, others: others.map((l) => l.name) };
}

export function namesFor(view: RepoView, branch: string, name: string) {
  return {
    branch,
    name,
    short: (oid) => view.commits.find((c) => c.oid === oid)?.short ?? oid,
  } satisfies MergeNames;
}

export const previewIn = (
  world: World,
  view: RepoView,
  name: string,
  noFF = false,
) => {
  const repo = world.repos.get(view.id);
  return repo ? previewMerge(world.objects, repo, name, noFF) : null;
};

/** One chip per branch HEAD could merge; pressing the picked one clears it. */
export function BranchChips({
  names,
  picked,
  onPick,
}: {
  names: readonly string[];
  picked: string | null;
  onPick: (name: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={picked === name}
          onClick={() => onPick(picked === name ? null : name)}
          className={chip}
        >
          <bdi>{name}</bdi>
        </button>
      ))}
    </div>
  );
}

/** Pick a branch to see what `git merge` would do before you run it (B4.1). */
export function MergePreviewWidget() {
  const session = useLessonSession();
  return session ? <MergePreviewFor session={session} /> : null;
}

function MergePreviewFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const [name, setName] = useState<string | null>(null);
  const [noFF, setNoFF] = useState(false);
  if (!view || !layout) return null;
  const { branch, others } = mergeCandidates(view);
  const picked = name && others.includes(name) ? name : null;
  const preview = picked ? previewIn(world, view, picked, noFF) : null;
  const forced =
    noFF &&
    picked !== null &&
    previewIn(world, view, picked)?.kind === "fast-forward";
  const command = picked
    ? `git merge ${noFF ? "--no-ff " : ""}${shellQuote(picked)}`
    : null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Pick a branch to merge into {branch ?? "HEAD"} and see the outcome
        before you run it. Nothing runs.
      </figcaption>
      {branch && others.length ? (
        <>
          <BranchChips names={others} picked={picked} onPick={setName} />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={noFF}
              onChange={(event) => setNoFF(event.target.checked)}
              className="size-5 accent-accent-fill"
            />
            <code>--no-ff</code> (always make a merge commit)
          </label>
        </>
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          Switch to a branch with another branch beside it to preview a merge.
        </p>
      )}
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        highlight={
          picked
            ? { kind: "reach", oids: broughtIn(world, view, picked) }
            : null
        }
      />
      <output className="grid min-h-11 content-center gap-1 text-sm">
        {command && preview && branch && picked ? (
          <>
            <code>{command}</code>
            <span>
              {outcomeText(preview, namesFor(view, branch, picked), forced)}
            </span>
          </>
        ) : (
          "No branch picked."
        )}
      </output>
    </figure>
  );
}
