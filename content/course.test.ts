import { describe, expect, it } from "vitest";
import { courseSteps, neighbours } from "./course";
import { lessonCode, lessonsOf } from "./registry";
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
