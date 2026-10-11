import { describe, expect, it } from "vitest";
import { runLine } from "./run";
import type { World } from "./types";
import { createWorld } from "./world/create";

function run(lines: string[]) {
  let world: World = createWorld({ dirs: ["p"], cwd: "p" });
  const out = lines.map((line) => {
    const result = runLine(world, line);
    world = result.world;
    const last = result.outcomes.at(-1);
    return `${last?.output.stdout ?? ""}${last?.output.stderr ?? ""}`;
  });
  return out;
}

describe("prototype-like names stay plain data (S-15)", () => {
  it.each(["__proto__", "constructor", "prototype"])(
    "%s works as a path and a branch",
    (name) => {
      const out = run([
        "git init -q",
        `echo hi > ${name}`,
        `git add ${name}`,
        "git commit -q -m first",
        `git switch -q -c ${name}`,
        `echo bye > ${name}`,
        "git status --short --branch",
      ]);
      expect(out[6]).toBe(`## ${name}\n M ${name}\n`);
    },
  );

  it("treats them as config keys only where Git allows the name", () => {
    const out = run([
      "git init -q",
      "git config set constructor.prototype value",
      "git config get constructor.prototype",
      "git config get toString.valueOf",
      "git config set __proto__.key value",
    ]);
    expect(out.slice(2)).toEqual([
      "value\n",
      "",
      "error: invalid key: __proto__.key\n",
    ]);
  });
});
