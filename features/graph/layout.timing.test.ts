import { expect, it } from "vitest";
import { fakeView } from "./fake-history";
import { layoutGraph } from "./layout";

it("lays out 300 commits in 8 ms", () => {
  const parents = Array.from({ length: 300 }, (_, i) =>
    i === 0
      ? []
      : i % 7 === 0 && i > 8
        ? [i - 1, i - 5]
        : [i % 3 === 0 ? i - 3 : i - 1],
  );
  const view = fakeView(parents);
  const options = { column: 40, lane: 30, glyph: 8, pad: 10 };
  for (let i = 0; i < 5; i++) layoutGraph(view, options);
  const times = Array.from({ length: 9 }, () => {
    const start = performance.now();
    layoutGraph(view, options);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  expect(times[4]).toBeLessThan(8);
});
