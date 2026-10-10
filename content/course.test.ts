import { describe, expect, it } from "vitest";
import { courseSteps, neighbours } from "./course";
import { capstoneHref } from "./routes";

describe("course steps", () => {
  it("lists ready lessons, then the chapter's capstone", () => {
    const steps = courseSteps("beginner").map((s) => s.href);
    expect(steps.slice(0, 2)).toEqual(["/learn/b1-1", "/capstones/b1"]);
  });

  it("finds the pages before and after one", () => {
    const { previous, next } = neighbours("beginner", capstoneHref("b1"));
    expect(previous?.label).toBe("B1.1 Save points for a whole project");
    expect(next?.href).not.toBe("/capstones/b1");
    expect(neighbours("beginner", "/nowhere" as never)).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});
