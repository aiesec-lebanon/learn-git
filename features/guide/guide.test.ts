import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { voiceProblems } from "@/content/guide/voice";
import { REFUSAL_GUIDE } from "@/content/guide/refusals";
import { guideLine } from "./controller";

const session = () =>
  new Session(createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" }));

describe("guideLine", () => {
  it("stays idle and quiet before a run or when off", () => {
    const s = session();
    expect(guideLine([], "full")).toEqual({ pose: "idle", text: null });
    expect(guideLine(s.run("git init"), "off")).toEqual({
      pose: "idle",
      text: null,
    });
  });

  it("narrates changes in full and stays quiet in light", () => {
    const s = session();
    const ran = s.run("git init");
    const full = guideLine(ran, "full");
    expect(full.pose).toBe("explaining");
    expect(full.text).toMatch(/repository/i);
    expect(voiceProblems(full.text ?? "")).toEqual([]);
    expect(guideLine(ran, "light")).toEqual({ pose: "explaining", text: null });
  });

  it("translates refusals at every verbosity but off", () => {
    const s = session();
    const ran = s.run("git status");
    for (const v of ["full", "light"] as const)
      expect(guideLine(ran, v)).toEqual({
        pose: "surprised",
        text: REFUSAL_GUIDE["not-a-repository"],
      });
  });

  it("looks pleased only when the run reached the target", () => {
    const s = session();
    expect(guideLine(s.run("git init"), "full", true).pose).toBe("pleased");
    expect(guideLine(s.run("git log"), "full", true).pose).toBe("surprised");
  });
});
