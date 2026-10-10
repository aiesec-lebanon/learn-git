import { describe, expect, it } from "vitest";
import { REFUSAL_GUIDE } from "./refusals";
import { voiceProblems } from "./voice";

describe("guide voice", () => {
  it("flags banned words, exclamation marks and emoji", () => {
    expect(voiceProblems("Simply run it!")).toEqual([
      'says "Simply"',
      "uses an exclamation mark",
    ]);
    expect(voiceProblems("Done 🎉")).toEqual(["uses an emoji"]);
    expect(voiceProblems("main moved back three commits.")).toEqual([]);
  });

  it("keeps every refusal translation in voice and short", () => {
    for (const [code, line] of Object.entries(REFUSAL_GUIDE)) {
      expect(voiceProblems(line), code).toEqual([]);
      expect(line.split(/\s+/).length, code).toBeLessThanOrEqual(25);
    }
  });
});
