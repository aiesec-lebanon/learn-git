import { describe, expect, it } from "vitest";
import { countPar, createWorld, match, Session } from "@/engine";
import { runStep, type Step } from "../define";
import { voiceProblems } from "../guide/voice";
import { referenceById } from "../reference/registry";
import { CHAPTERS } from "../registry";
import { puzzlesOf } from ".";

const play = (
  world: Parameters<typeof createWorld>[0],
  steps: readonly Step[],
) => {
  const session = new Session(createWorld(world));
  for (const step of steps) runStep(session, step);
  return session.getSnapshot();
};

describe("puzzles", () => {
  it("lists one puzzle per Beginner lesson, by chapter in lesson order", () => {
    const ids = CHAPTERS.flatMap((c) =>
      puzzlesOf(c.id).map((p) => p.lesson.id),
    );
    expect(ids).toHaveLength(18);
    expect(puzzlesOf("b1").map((p) => p.lesson.id)).toEqual([
      "b1-1",
      "b1-2",
      "b1-3",
    ]);
  });
});

for (const chapter of CHAPTERS) {
  for (const { lesson, challenge } of puzzlesOf(chapter.id)) {
    describe(`puzzle ${lesson.id}`, () => {
      it("does not start solved", () => {
        expect(match(createWorld(challenge.world), challenge.target).ok).toBe(
          false,
        );
      });

      it("has a hint ladder in the guide's voice", () => {
        const { reference, ...lines } = challenge.hints ?? { nudge: "" };
        expect(challenge.hints).toBeDefined();
        for (const line of Object.values(lines))
          expect(voiceProblems(line)).toEqual([]);
        if (reference) expect(referenceById(reference)).toBeDefined();
      });

      it.each(challenge.underPar ?? [])(
        "is solved under par: $why",
        ({ solution, why }) => {
          const end = play(challenge.world, solution);
          expect(match(end.world, challenge.target).differences).toEqual([]);
          expect(countPar(end.history)).toBeLessThan(challenge.par);
          expect(voiceProblems(why)).toEqual([]);
        },
      );
    });
  }
}
