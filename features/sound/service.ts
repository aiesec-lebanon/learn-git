"use client";

import { useEffect } from "react";
import type { HistoryEntry, Session } from "@/engine";
import { useProgress } from "@/features/progress/progress";
import { sounds } from "@/themes/active";
import type { SoundCue } from "@/themes/contract";
import { cueFor } from "./cues";

type Synth = ReturnType<typeof import("./synth").createSynth>;

let synth: Promise<Synth> | null = null;

/** The page's one synth, loaded on the first cue after sound is turned on. */
const loadSynth = () =>
  (synth ??= import("./synth").then(({ createSynth }) => createSynth()));

const RANK: readonly SoundCue[] = ["conflict", "merge", "commit"];

/** The cue for a batch of new entries: the most notable one. */
export function cueOf(entries: readonly HistoryEntry[]): SoundCue | null {
  const cues = new Set(entries.map(cueFor));
  return RANK.find((cue) => cues.has(cue)) ?? null;
}

/** Plays the theme's sound when the learner's command commits, merges or conflicts; silent when sound is off. */
export function useSoundCues(session: Session): void {
  const { sound } = useProgress().prefs;
  useEffect(() => {
    if (!sound) return;
    let seen = session.getSnapshot().step;
    const stop = session.subscribe(() => {
      const { history, step } = session.getSnapshot();
      const fresh = step - seen;
      seen = step;
      const cue = fresh > 0 ? cueOf(history.slice(-fresh)) : null;
      if (cue) void loadSynth().then((s) => s.play(sounds[cue]));
    });
    const hide = () => {
      if (document.hidden) void synth?.then((s) => s.suspend());
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [session, sound]);
}
