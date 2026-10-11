"use client";

import { use, useRef } from "react";
import { browser } from "react-dom";
import { progressStore, useProgress } from "@/features/progress/progress";
import type { Prefs } from "@/features/progress/schema";
import { Button } from "@/ui/button";

type Choice<K extends keyof Prefs> = {
  readonly key: K;
  readonly legend: string;
  readonly options: readonly (readonly [Prefs[K], string])[];
};

const THEME: Choice<"theme"> = {
  key: "theme",
  legend: "Theme",
  options: [
    ["system", "Match my device"],
    ["light", "Light"],
    ["dark", "Dark"],
  ],
};

const MOTION: Choice<"motion"> = {
  key: "motion",
  legend: "Motion",
  options: [
    ["system", "Match my device"],
    ["reduce", "Reduce motion: lessons move in steps"],
  ],
};

const GUIDE: Choice<"guide"> = {
  key: "guide",
  legend: "Guide",
  options: [
    ["full", "Full: Nib explains every change"],
    ["light", "Light: Nib speaks only when Git refuses"],
    ["off", "Off"],
  ],
};

function Radios<K extends "theme" | "motion" | "guide">({
  choice,
  value,
}: {
  choice: Choice<K>;
  value: Prefs[K];
}) {
  return (
    <fieldset className="m-0 grid gap-1 border-0 p-0">
      <legend className="mb-2 p-0 font-display text-xl font-bold">
        {choice.legend}
      </legend>
      {choice.options.map(([option, label]) => (
        <label
          key={option}
          className="flex min-h-11 cursor-pointer items-center gap-3"
        >
          <input
            type="radio"
            name={choice.key}
            value={option}
            checked={value === option}
            onChange={() => progressStore().setPrefs({ [choice.key]: option })}
            className="size-5 accent-accent-fill"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

/** Settings v1: applied at once and kept with progress (ADR-008). */
export function SettingsForm() {
  use(browser("Settings live in localStorage."));
  const { prefs } = useProgress();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div className="grid gap-8">
      <Radios choice={THEME} value={prefs.theme} />
      <Radios choice={MOTION} value={prefs.motion} />
      <Radios choice={GUIDE} value={prefs.guide} />
      <fieldset className="m-0 grid gap-1 border-0 p-0">
        <legend className="mb-2 p-0 font-display text-xl font-bold">
          Predictions
        </legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.predictions}
            onChange={(event) =>
              progressStore().setPrefs({ predictions: event.target.checked })
            }
            className="size-5 accent-accent-fill"
          />
          Offer a guess before key commands (never scored)
        </label>
      </fieldset>
      <section
        aria-labelledby="reset"
        className="grid justify-items-start gap-2"
      >
        <h2 id="reset" className="m-0 text-xl font-bold">
          Progress
        </h2>
        <p className="m-0 max-w-prose text-fg-muted">
          Progress stays in this browser: where you left off, the chapters you
          finished and these settings.
        </p>
        <Button onClick={() => dialog.current?.showModal()}>
          Reset progress
        </Button>
      </section>
      <dialog
        ref={dialog}
        aria-labelledby="reset-title"
        className="m-auto max-w-md rounded-sm border border-line bg-surface p-6 text-fg shadow-3 backdrop:bg-fg/40"
      >
        <form method="dialog" className="grid gap-4">
          <h2 id="reset-title" className="m-0 text-xl font-bold">
            Reset progress?
          </h2>
          <p className="m-0">
            This forgets where you left off, the chapters you finished and your
            settings. It cannot be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" value="cancel">
              Cancel
            </Button>
            <Button
              type="submit"
              value="reset"
              variant="primary"
              onClick={() => progressStore().reset()}
            >
              Reset progress
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
