import { describe, expect, it } from "vitest";
import { voiceProblems } from "./guide/voice";
import { chaptersOf } from "./registry";
import { SELF_CHECK, suggest } from "./self-check";

const beginner = SELF_CHECK[0].statements.map((s) => s.id);
const all = SELF_CHECK.flatMap((t) => t.statements.map((s) => s.id));

describe("self-check", () => {
  it("has one statement per Beginner chapter, in order, in the guide's voice", () => {
    expect(beginner).toEqual(chaptersOf("beginner").map((c) => c.id));
    for (const { text } of SELF_CHECK.flatMap((t) => t.statements))
      expect(voiceProblems(text)).toEqual([]);
  });

  it("suggests the first chapter with an unticked statement and says why", () => {
    expect(suggest(new Set())).toEqual({
      kind: "chapter",
      chapter: "b1",
      reason:
        "You didn't tick: I can turn a folder into a repository and commit only some of my changes.",
    });
    expect(suggest(new Set(["b1", "b2", "b4"]))).toMatchObject({
      chapter: "b3",
    });
  });

  it("counts finished chapters as ticked", () => {
    expect(suggest(new Set(["b1"]), ["b2"])).toMatchObject({ chapter: "b3" });
  });

  it("points past Beginner to what comes next, then to nothing", () => {
    expect(suggest(new Set(beginner))).toEqual({
      kind: "coming-next",
      reason:
        "You didn't tick: I can amend, reset (soft, mixed, hard) and revert, and I know which is safe after pushing.",
    });
    expect(suggest(new Set(all))).toEqual({ kind: "everything" });
  });
});
