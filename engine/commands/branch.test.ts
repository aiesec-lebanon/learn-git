import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { createWorld } from "../world/create";

const committed = () =>
  createWorld({
    files: { "p/a.txt": "a\n" },
    cwd: "p",
    setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
  });

const last = (line: string) => {
  const { outcomes } = runLine(committed(), line);
  const outcome = outcomes.at(-1);
  if (!outcome) throw new Error(line);
  return outcome;
};

describe("git branch", () => {
  it("answers the argument errors Git answers", () => {
    expect(last("git branch -d -m x").output.exitCode).toBe(129);
    expect(last("git branch -m a b c").output.stderr).toBe(
      "fatal: too many arguments for a rename operation\n",
    );
    expect(
      last("git branch t 78981922613b2afb6025042ff6bd878ac1994e85").output
        .stderr,
    ).toBe(
      "fatal: not a valid branch point: '78981922613b2afb6025042ff6bd878ac1994e85'\n",
    );
    expect(last("git branch -c a b").output.stderr).toContain("not simulated");
  });

  it("checks -d against a remote upstream when it exists", () => {
    const outcome = last(
      "git branch side; git config branch.side.remote origin; git config branch.side.merge refs/heads/side; git branch -d side",
    );
    expect(outcome.output.stdout).toMatch(/^Deleted branch side/);
    expect(outcome.effects).toContainEqual(
      expect.objectContaining({
        kind: "config-changed",
        key: "branch.side.remote",
        to: null,
      }),
    );
  });

  it("moves the branch's config section on rename", () => {
    const outcome = last(
      "git branch side; git config branch.side.remote .; git branch -m side topic",
    );
    expect(outcome.effects).toContainEqual(
      expect.objectContaining({ key: "branch.topic.remote", to: "." }),
    );
  });

  it("names the refusals", () => {
    const code = (line: string) =>
      last(line).effects.find((e) => e.kind === "refused");
    expect(code("git branch a..b")).toMatchObject({ code: "invalid-ref-name" });
    expect(code("git branch main")).toMatchObject({ code: "branch-exists" });
    expect(code("git branch -m nope x")).toMatchObject({
      code: "no-such-branch",
    });
    expect(code("git branch -D main")).toMatchObject({
      code: "branch-checked-out",
    });
  });
});
