import { describe, expect, it } from "vitest";
import { hashObject } from "../objects/hash";
import { detectRenames } from "./renames";
import type { FilePair } from "./unified";

const body = (seed: number) =>
  Array.from({ length: 200 }, (_, i) => `line ${seed} ${i}\n`).join("");

const pair = (path: string, content: string, side: "before" | "after") => {
  const file = {
    oid: hashObject({ type: "blob", content }),
    mode: "100644" as const,
    content,
  };
  return {
    path,
    before: side === "before" ? file : null,
    after: side === "after" ? file : null,
  } satisfies FilePair;
};

const candidates = (sources: number, targets: number) => [
  ...Array.from({ length: sources }, (_, i) =>
    pair(`old/${i}.txt`, body(i), "before"),
  ),
  ...Array.from({ length: targets }, (_, i) =>
    pair(`new/${i}.txt`, `${body(i)}edited\n`, "after"),
  ),
];

describe("rename detection at the 100 x 100 cap", () => {
  it("scores every candidate quickly", () => {
    const started = performance.now();
    const out = detectRenames(candidates(100, 100));
    expect(out.filter((p) => p.from).length).toBe(100);
    expect(performance.now() - started).toBeLessThan(3000);
  });

  it("skips inexact matching above the cap", () => {
    const out = detectRenames(candidates(101, 100));
    expect(out.filter((p) => p.from).length).toBe(0);
  });
});
