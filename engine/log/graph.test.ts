import { describe, expect, it } from "vitest";
import type { Oid } from "../types";
import { drawGraph } from "./graph";

const o = (c: string) => c as Oid;

describe("drawGraph", () => {
  it("walks a far line left with a horizontal edge", () => {
    const { text } = drawGraph(
      [
        { oid: o("a"), parents: [o("p")], lines: ["a"] },
        { oid: o("b"), parents: [o("q")], lines: ["b"] },
        { oid: o("c"), parents: [o("r")], lines: ["c"] },
        { oid: o("d"), parents: [o("p")], lines: ["d"] },
      ],
      false,
    );
    expect(text).toBe(
      ["* a", "| * b", "| | * c", "| | | * d", "| |_|/  ", "|/| |   ", ""].join(
        "\n",
      ),
    );
  });
});
