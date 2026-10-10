import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { nudgeDue } from "./hints";

const history = (lines: string[]) => {
  const s = new Session(createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" }));
  for (const line of lines) s.run(line);
  return s.getSnapshot().history;
};

describe("nudgeDue", () => {
  it("is due after two refusals in a row with the same code", () => {
    expect(nudgeDue(history(["git log", "git status"]))).toBe(true);
  });

  it("is not due for one refusal, different codes or a success between", () => {
    expect(nudgeDue(history(["git log"]))).toBe(false);
    expect(nudgeDue(history(["git log", "gti"]))).toBe(false);
    expect(nudgeDue(history(["git log", "ls", "git status"]))).toBe(false);
    expect(nudgeDue([])).toBe(false);
  });
});
