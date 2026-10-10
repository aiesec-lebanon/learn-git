import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { createWorld } from "../world/create";

const committed = () =>
  createWorld({
    files: { "p/a.txt": "a\n", "p/src/deep/b.txt": "b\n" },
    cwd: "p",
    setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
  });

const refusal = (line: string) =>
  runLine(committed(), line)
    .outcomes.at(-1)
    ?.effects.find((e) => e.kind === "refused");

describe("git rm and git mv", () => {
  it("name their refusals", () => {
    expect(refusal("echo x >> a.txt; git rm a.txt")).toMatchObject({
      code: "would-lose-changes",
    });
    expect(refusal("git rm src")).toMatchObject({ code: "not-recursive" });
    expect(refusal("echo n > n.txt; git mv n.txt m.txt")).toMatchObject({
      code: "not-tracked",
    });
    expect(refusal("git mv a.txt src")).toBeUndefined();
    expect(refusal("git mv a.txt nowhere/a.txt")).toMatchObject({
      code: "no-such-directory",
    });
  });

  it("say which options the sandbox does not simulate", () => {
    for (const line of ["git rm -n a.txt", "git mv -k a.txt b.txt"]) {
      const outcome = runLine(committed(), line).outcomes.at(-1);
      expect(outcome?.output.stderr, line).toContain("not simulated");
      expect(outcome?.output.exitCode).toBe(1);
    }
  });

  it("report removed files and the folders they leave empty", () => {
    const outcome = runLine(committed(), "git rm -r src").outcomes.at(-1);
    const files = outcome?.effects.find((e) => e.kind === "files-changed");
    expect(files).toMatchObject({
      changes: [
        { path: "/home/you/p/src/deep/b.txt", node: "file", change: "deleted" },
        { path: "/home/you/p/src/deep", node: "dir", change: "deleted" },
        { path: "/home/you/p/src", node: "dir", change: "deleted" },
      ],
    });
  });

  it("keep staged content when moving a file", () => {
    const world = runLine(
      committed(),
      "echo more >> a.txt; git add a.txt; git mv a.txt b.txt",
    ).world;
    const repo = [...world.repos.values()][0];
    expect([...(repo?.index.keys() ?? [])].sort()).toEqual([
      "b.txt",
      "src/deep/b.txt",
    ]);
    const staged = repo?.index.get("b.txt" as never)?.[0]?.oid;
    expect(world.objects.get(staged as never)).toEqual({
      type: "blob",
      content: "a\nmore\n",
    });
  });
});
