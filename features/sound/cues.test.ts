import { describe, expect, it } from "vitest";
import { createWorld, Session, type HistoryEntry } from "@/engine";
import { runStep, type Challenge } from "@/content/define";
import b1_2 from "@/content/lessons/b1-2/scene";
import b4_1 from "@/content/lessons/b4-1/scene";
import b4_2 from "@/content/lessons/b4-2/scene";
import b4_3 from "@/content/lessons/b4-3/scene";
import b6_3 from "@/content/lessons/b6-3/scene";
import { sounds } from "@/themes/active";
import type { SoundInstruments } from "@/themes/contract";
import { cueFor } from "./cues";
import { cueOf } from "./service";

function cues(challenge: Challenge | undefined, steps = challenge?.solution) {
  if (!challenge || !steps) throw new Error("no challenge");
  const session = new Session(createWorld(challenge.world));
  return steps.map((step) => {
    const mine = runStep(session, step).filter((e: HistoryEntry) => !e.actor);
    return mine.map(cueFor).find(Boolean) ?? null;
  });
}

describe("sound cues", () => {
  it("taps for a commit and stays silent for reading and refusals", () => {
    expect(
      cues(b1_2.challenge, [
        "git status",
        'git commit -m "Nothing staged yet"',
        "git add README.md",
        'git commit -m "Fix typo"',
      ]),
    ).toEqual([null, null, null, "commit"]);
  });

  it("presses a note for fast-forward and three-way merges", () => {
    expect(cues(b4_1.challenge)).toEqual([null, "merge", null]);
    expect(cues(b4_2.challenge)).toEqual([null, "merge", null]);
  });

  it("hums at a conflict, then taps when the merge is committed", () => {
    expect(cues(b4_3.challenge)).toEqual(["conflict", null, null, "merge"]);
  });

  it("presses a note when a pull request merges on the Hub", () => {
    expect(cues(b6_3.challenge).at(-1)).toBe("merge");
  });

  it("ranks the most notable cue of a batch first", () => {
    const session = new Session(createWorld(b4_3.challenge?.world));
    const entries = session.run("git merge pricing");
    expect(cueOf(entries)).toBe("conflict");
    expect(cueOf([])).toBeNull();
  });

  it("gives every cue a recipe that schedules sound", () => {
    for (const recipe of Object.values(sounds)) {
      const calls: number[] = [];
      const play: SoundInstruments = {
        tone: (t) => calls.push(t),
        noise: (t) => calls.push(t),
      };
      recipe(play, 1);
      expect(calls.length).toBeGreaterThan(0);
      expect(Math.min(...calls)).toBeGreaterThanOrEqual(1);
    }
  });
});
