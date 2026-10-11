import { describe, expect, it } from "vitest";
import { courseSteps, neighbours } from "./course";
import {
  chaptersOf,
  lessonCode,
  lessonsOf,
  lessonsOfTrack,
  scenariosOf,
  trackOfLesson,
} from "./registry";
import { capstoneHref, lessonHref } from "./routes";

const readyB1 = lessonsOf("b1").filter((l) => l.ready);

describe("course steps", () => {
  it("lists ready lessons, then the chapter's capstone", () => {
    const steps = courseSteps("beginner").map((s) => s.href);
    expect(steps.slice(0, readyB1.length + 1)).toEqual([
      ...readyB1.map((l) => lessonHref(l.id)),
      "/capstones/b1",
    ]);
  });

  it("finds the pages before and after one", () => {
    const { previous, next } = neighbours("beginner", capstoneHref("b1"));
    const last = readyB1.at(-1);
    expect(previous?.label).toBe(
      last && `${lessonCode(last.id)} ${last.title}`,
    );
    expect(next?.href).not.toBe("/capstones/b1");
    expect(neighbours("beginner", "/nowhere" as never)).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});

describe("intermediate track", () => {
  it("lists I1 to I7 with 23 lessons and 8 scenarios, none published yet", () => {
    expect(chaptersOf("intermediate").map((c) => c.id)).toEqual([
      "i1",
      "i2",
      "i3",
      "i4",
      "i5",
      "i6",
      "i7",
    ]);
    const lessons = lessonsOfTrack("intermediate");
    expect(lessons).toHaveLength(23);
    expect(lessons.every((l) => !l.ready)).toBe(true);
    expect(lessons.every((l) => trackOfLesson(l) === "intermediate")).toBe(
      true,
    );
    expect(scenariosOf("intermediate").map((s) => s.id)).toEqual([
      "s-i1",
      "s-i2",
      "s-i3",
      "s-i4",
      "s-i5",
      "s-i6",
      "s-i7",
      "s-i8",
    ]);
    expect(lessonCode("i1-2")).toBe("I1.2");
  });

  it("has no course steps until a page is written", () => {
    expect(courseSteps("intermediate")).toEqual([]);
    expect(lessonsOfTrack("beginner")).toHaveLength(18);
  });
});
