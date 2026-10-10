import { describe, expect, it } from "vitest";
import { recordedFixtures } from "./fixtures";
import { pendingReason, replayFixture } from "./replay";

describe("fixture replay", () => {
  for (const fixture of recordedFixtures) {
    const pending = pendingReason(fixture);
    it.skipIf(pending !== null)(
      `${fixture.id}${pending ? ` (${pending})` : ""}`,
      () => {
        const { steps, final } = replayFixture(fixture);
        for (const { expected, actual, changes } of steps) {
          expect(actual).toEqual(expected);
          expect(changes.emitted, expected.cmd).toEqual(changes.derived);
        }
        expect(final).toEqual(fixture.final);
      },
    );
  }
});
