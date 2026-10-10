import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { pairs, tokens } from "./active";

describe.each(["light", "dark"] as const)("active theme, %s", (mode) => {
  const set = tokens[mode];

  it.each(pairs)("%s: %s on %s reaches %d:1", (_label, fg, bg, min) => {
    expect(contrastRatio(set[fg], set[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("active theme", () => {
  it("uses AIESEC blue as the accent and focus colour in both modes", () => {
    for (const set of [tokens.light, tokens.dark]) {
      expect([set.accent, set.focus]).toEqual(["#037EF3", "#037EF3"]);
    }
  });
});
