import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { createWorld } from "../world/create";

const notes = (line: string) =>
  runLine(
    createWorld({
      files: { "p/a.txt": "a\n" },
      cwd: "p",
      setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
    }),
    line,
  ).outcomes.at(-1)?.notes;

describe("git checkout branch forms", () => {
  it("name the git switch command they stand for", () => {
    expect(notes("git checkout -b topic")).toEqual([
      "Older form of: git switch -c topic",
    ]);
    expect(notes("git branch t; git checkout t")).toEqual([
      "Older form of: git switch t",
    ]);
    expect(notes("git checkout -B t main")).toEqual([
      "Older form of: git switch -C t main",
    ]);
    expect(notes("git checkout HEAD")).toEqual([
      "Older form of: git switch --detach HEAD",
    ]);
  });

  it("answer forms the sandbox leaves out", () => {
    const outcome = runLine(
      createWorld({ files: {}, setup: ["git init -q"] }),
      "git checkout -b x -- a.txt; git checkout a b -- c",
    ).outcomes;
    expect(outcome[0]?.output.stderr).toMatch(/^not simulated here/);
    expect(outcome[1]?.output.stderr).toBe(
      "fatal: only one reference expected, 2 given.\n",
    );
  });
});
