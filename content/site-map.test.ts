import { describe, expect, it } from "vitest";
import { sitePaths } from "./site-map";

describe("site map", () => {
  it("lists every page once: 18 lessons, 6 capstones, 4 scenarios, 26 reference entries", () => {
    const paths = sitePaths();
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.filter((p) => p.startsWith("/learn/"))).toHaveLength(18);
    expect(paths.filter((p) => p.startsWith("/capstones/"))).toHaveLength(6);
    expect(paths.filter((p) => p.startsWith("/scenarios/"))).toHaveLength(4);
    expect(paths.filter((p) => p.startsWith("/reference/"))).toHaveLength(26);
    expect(paths).not.toContain("/settings");
    expect(paths).toContain("/tracks/intermediate");
    expect(paths).not.toContain("/learn/i1-1");
  });
});
