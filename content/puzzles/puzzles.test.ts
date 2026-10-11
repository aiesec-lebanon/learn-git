import { describe, expect, it } from "vitest";
import { CHAPTERS } from "../registry";
import { puzzlesOf } from ".";

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
