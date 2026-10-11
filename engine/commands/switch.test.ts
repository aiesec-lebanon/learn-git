import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { createWorld } from "../world/create";

const last = (line: string) => {
  const world = createWorld({
    files: { "p/a.txt": "a\n" },
    cwd: "p",
    setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
  });
  const outcome = runLine(world, line).outcomes.at(-1);
  if (!outcome) throw new Error(line);
  return outcome;
};

describe("git switch", () => {
  it("resets the current branch with -C", () => {
    expect(last("git switch -C main").output.stderr).toBe(
      "Reset branch 'main'\n",
    );
  });

  it("names its refusals", () => {
    const code = (line: string) =>
      last(line).effects.find((e) => e.kind === "refused");
    expect(code("git switch nope")).toMatchObject({ code: "unknown-revision" });
    expect(code("git switch -c main")).toMatchObject({ code: "branch-exists" });
    expect(code("git switch HEAD")).toMatchObject({ code: "usage" });
    expect(
      code(
        "git branch t; git switch t; echo b > a.txt; git commit -qam b; git switch main; echo c > a.txt; git switch t",
      ),
    ).toMatchObject({ code: "would-lose-changes" });
  });

  it("goes back to a detached commit with -", () => {
    const outcome = last(
      "git switch -q --detach; git switch -q main; git switch -",
    );
    expect(outcome.output.stderr).toMatch(/^fatal: a branch is expected/);
  });
});
