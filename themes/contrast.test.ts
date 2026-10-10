import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("measures the extremes and is symmetric", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("puts AIESEC blue below text contrast on white", () => {
    expect(contrastRatio("#037EF3", "#FFFFFF")).toBeCloseTo(3.98, 2);
  });

  it("rejects values that are not opaque hex colours", () => {
    expect(() => contrastRatio("rgba(0,0,0,0.5)", "#FFFFFF")).toThrow();
    expect(() => contrastRatio("#12345", "#FFFFFF")).toThrow();
  });
});
