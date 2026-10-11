import { describe, expect, it } from "vitest";
import { createWorld } from "@/engine";
import { textGraph } from "./text-graph.model";

describe("text graph", () => {
  it("pairs each commit line with its commit and leaves graph rows bare", () => {
    const world = createWorld({
      files: { "p/a.txt": "a\n" },
      cwd: "p",
      setup: [
        "git init -q",
        "git add .",
        'git commit -q -m "One"',
        "git switch -q -c side",
        "echo s >> a.txt",
        'git commit -q -am "Side"',
        "git switch -q main",
        "echo m >> a.txt",
        'git commit -q -am "Main"',
      ],
    });
    const lines = textGraph(world);
    expect(lines.map((l) => l.text.replace(/[0-9a-f]{7}/, "#"))).toEqual([
      "* # (HEAD -> main) Main",
      "| * # (side) Side",
      "|/  ",
      "* # One",
    ]);
    expect(lines.map((l) => l.oid !== null)).toEqual([true, true, false, true]);
  });
});
