import type { ThemeSounds } from "../contract";

type Play = Parameters<ThemeSounds["commit"]>[0];

/** A felt tip touching the board. */
const knock = (s: Play, t: number, f: number, gain: number) => {
  s.tone(t, {
    f,
    f2: f * 0.58,
    glide: 0.06,
    type: "triangle",
    a: 0.002,
    d: 0.13,
    gain,
    filter: "lowpass",
    ff: 1500,
    q: 0.6,
  });
  s.noise(t, { a: 0.001, d: 0.03, gain: gain * 0.3, ff: 3400, q: 1.6 });
};

/** Taps and hums: a marker tap, a note pressed flat, a questioning hum. */
export const sounds: ThemeSounds = {
  commit: (s, t) => {
    knock(s, t, 300, 0.3);
    s.tone(t + 0.05, { f: 880, a: 0.006, d: 0.24, gain: 0.07 });
  },
  merge: (s, t) => {
    s.noise(t, {
      a: 0.003,
      d: 0.09,
      gain: 0.14,
      filter: "lowpass",
      ff: 700,
      q: 0.5,
    });
    s.tone(t, { f: 130, f2: 72, glide: 0.09, a: 0.002, d: 0.14, gain: 0.32 });
    for (const [f, gain] of [
      [587.33, 0.085],
      [739.99, 0.07],
    ] as const)
      s.tone(t + 0.1, {
        f,
        type: "triangle",
        a: 0.02,
        d: 0.5,
        gain,
        filter: "lowpass",
        ff: 2600,
        q: 0.5,
      });
  },
  conflict: (s, t) => {
    knock(s, t, 280, 0.24);
    knock(s, t + 0.12, 250, 0.2);
    s.tone(t + 0.26, {
      f: 220,
      f2: 233.08,
      glide: 0.22,
      type: "triangle",
      a: 0.03,
      d: 0.44,
      gain: 0.17,
      filter: "lowpass",
      ff: 760,
      q: 0.7,
    });
  },
};
