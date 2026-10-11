import { describe, expect, it } from "vitest";
import { recordedFixtures } from "./fixtures";
import { pendingReason, replayFixture } from "./replay";

/**
 * Effects may report passing states of files, the index and HEAD (a
 * rebase detaches HEAD and replays commits); refs, objects and config
 * must match the net change exactly.
 */
const transient = (key: string) => /^(file|dir|index|head) /.test(key);

describe("fixture replay", () => {
  for (const fixture of recordedFixtures) {
    const pending = pendingReason(fixture);
    it.skipIf(pending !== null)(
      `${fixture.id}${pending ? ` (${pending})` : ""}`,
      () => {
        const { steps, final } = replayFixture(fixture);
        for (const { expected, actual, changes } of steps) {
          expect(actual).toEqual(expected);
          const { emitted, derived } = changes;
          const extra = emitted.filter(
            (e) => !derived.includes(e) && !transient(e),
          );
          expect(
            derived.filter((d) => !emitted.includes(d)),
            expected.cmd,
          ).toEqual([]);
          expect(extra, expected.cmd).toEqual([]);
        }
        expect(final).toEqual(fixture.final);
      },
    );
  }
});
