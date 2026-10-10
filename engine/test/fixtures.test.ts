import { describe, expect, it } from "vitest";
import { fixtureScripts, PINNED_GIT, recordedFixtures } from "./fixtures";

describe("recorded fixtures", () => {
  it("has a recording for every script and a script for every recording", () => {
    expect(recordedFixtures.length).toBeGreaterThan(0);
    expect(recordedFixtures.map((f) => f.id).sort()).toEqual(
      [...fixtureScripts.keys()].sort(),
    );
  });

  it.each(recordedFixtures.map((f) => [f.id, f] as const))(
    "%s is current and clean",
    (id, fixture) => {
      expect(fixture.git.startsWith(`${PINNED_GIT}.`)).toBe(true);
      expect(fixture.script).toEqual(fixtureScripts.get(id));
      expect(fixture.steps).toHaveLength(fixture.script.steps.length);
      const text = JSON.stringify(fixture);
      expect(text).not.toMatch(/lg-fx-|\\r|AppData|[A-Z]:\/Users/);
    },
  );
});
