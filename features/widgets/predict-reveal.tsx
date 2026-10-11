"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import type { Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { commitTarget, splitTarget } from "@/features/graph/drag/targets";
import { useSandboxView } from "@/features/graph/use-sandbox-view";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { useProgress } from "@/features/progress/progress";
import { Button } from "@/ui/button";
import {
  BranchChips,
  chip,
  mergeCandidates,
  namesFor,
  previewIn,
} from "./merge-preview";
import { comparisonText, landing, type Landing } from "./merge-preview.model";

/**
 * Guess where the current branch lands after `git merge`, then reveal what Git
 * does. Never scored or stored; the Predictions setting hides it (X-04).
 */
export function PredictReveal() {
  use(browser("Predictions run in the browser."));
  const session = useLessonSession();
  const { predictions } = useProgress().prefs;
  return session && predictions ? <PredictFor session={session} /> : null;
}

type Guess = { readonly name: string; readonly landing: Landing | null };

function PredictFor({ session }: { session: Session }) {
  const { world, view, layout } = useSandboxView(session);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [revealed, setRevealed] = useState(false);
  if (!view || !layout) return null;
  const { branch, others } = mergeCandidates(view);
  const name = guess && others.includes(guess.name) ? guess.name : null;
  const preview = name ? previewIn(world, view, name) : null;
  const shown = revealed && preview !== null;
  const actual = shown ? landing(preview) : null;
  const pick = (next: Landing) => {
    if (name && !shown) setGuess({ name, landing: next });
  };
  const guessed = name ? (guess?.landing ?? null) : null;
  const aimed = guessed?.kind === "commit" ? commitTarget(guessed.oid) : null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="text-sm">
        Predict, then look. Pick a branch to merge into {branch ?? "HEAD"}, then
        tap the commit where you think {branch ?? "it"} will land, or choose a
        new commit. Nothing is scored and nothing runs.
      </figcaption>
      {branch && others.length ? (
        <BranchChips
          names={others}
          picked={name}
          onPick={(next) => {
            setGuess(next ? { name: next, landing: null } : null);
            setRevealed(false);
          }}
        />
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          Switch to a branch with another branch beside it to make a prediction.
        </p>
      )}
      <CommitGraph
        view={view}
        layout={layout}
        label="Your turn repository"
        drop={
          name
            ? {
                aimed,
                onPress: shown
                  ? null
                  : (target) => {
                      const [kind, value = ""] = splitTarget(target);
                      const oid =
                        kind === "commit"
                          ? view.commits.find((c) => c.oid === value)?.oid
                          : view.labels.find((l) => l.name === value)?.target;
                      if (oid) pick({ kind: "commit", oid });
                    },
                head: {},
              }
            : undefined
        }
        highlight={
          actual?.kind === "commit"
            ? { kind: "reach", oids: new Set([actual.oid]) }
            : null
        }
      />
      {name && !shown ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={guessed?.kind === "new"}
            onClick={() => pick({ kind: "new" })}
            className={chip}
          >
            A new commit
          </button>
          <Button variant="primary" onClick={() => setRevealed(true)}>
            {guessed ? "Show what Git does" : "Skip and show"}
          </Button>
        </div>
      ) : null}
      <output className="grid min-h-11 content-center text-sm">
        {!name || !branch
          ? "No branch picked."
          : shown
            ? comparisonText(guessed, preview, namesFor(view, branch, name))
            : guessed
              ? `Your guess: ${branch} lands ${guessed.kind === "commit" ? `on ${namesFor(view, branch, name).short(guessed.oid)}` : "on a new commit"} after git merge ${name}.`
              : `Where will ${branch} be after git merge ${name}?`}
      </output>
      {shown && name ? (
        <Button
          variant="quiet"
          className="justify-self-start"
          onClick={() => {
            setGuess({ name, landing: null });
            setRevealed(false);
          }}
        >
          Guess again
        </Button>
      ) : null}
    </figure>
  );
}
