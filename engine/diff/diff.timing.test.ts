import { describe, expect, it } from "vitest";
import { numstat } from "./numstat";

const lines = (count: number, make: (i: number) => string) =>
  Array.from({ length: count }, (_, i) => `${make(i)}\n`).join("");

describe("diff at the 2,000-line cap", () => {
  it("handles two unrelated files quickly", () => {
    const started = performance.now();
    const stat = numstat(
      lines(2000, (i) => `a${i}`),
      lines(2000, (i) => `b${i}`),
    );
    expect(stat).toEqual({ added: 2000, deleted: 2000, binary: false });
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("handles scattered edits quickly", () => {
    const started = performance.now();
    const stat = numstat(
      lines(2000, (i) => `line ${i}`),
      lines(2000, (i) => (i % 7 === 0 ? `edited ${i}` : `line ${i}`)),
    );
    expect(stat.added).toBe(286);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
