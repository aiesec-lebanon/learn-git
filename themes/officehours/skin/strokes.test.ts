import { describe, expect, it } from "vitest";
import { edgePath, handRing, tilt } from "./strokes";

const edge = (to: [number, number], from: [number, number], merge = false) => ({
  key: `${to}:${from}`,
  to: { x: to[0], y: to[1] },
  from: { x: from[0], y: from[1] },
  merge,
  ghost: false,
});

describe("hand-drawn strokes", () => {
  it("draws the same ring for the same seed", () => {
    expect(handRing(11, 11, 42)).toBe(handRing(11, 11, 42));
    expect(handRing(11, 11, 42)).not.toBe(handRing(11, 11, 43));
    expect(handRing(11, 11, 42)).toMatch(/^M-?[\d.]+ -?[\d.]+(C[-\d. ]+){5}$/);
  });

  it("keeps note tilts small", () => {
    for (const name of ["main", "feature", "fix/typo", ""])
      expect(Math.abs(tilt(name))).toBeLessThanOrEqual(2.2);
  });

  it("draws arrows from child to parent: straight, fork and merge", () => {
    const straight = edgePath(edge([148, 36], [40, 36]), 15, 108);
    expect(straight).toMatch(/^M133 36Q/);
    expect(straight).toContain("L55 36");
    expect(edgePath(edge([148, 128], [40, 36]), 15, 108)).toMatch(
      /^M133 128C.* 55 36M/,
    );
    expect(edgePath(edge([148, 36], [40, 128], true), 15, 108)).toMatch(
      /^M133 36C/,
    );
    expect(edgePath(edge([40, 60], [40, 10]), 15, 108)).toMatch(
      /^M40 45L40 25M/,
    );
  });
});
