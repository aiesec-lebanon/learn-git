import { describe, expect, it } from "vitest";
import { canonicalKey } from "../config/keys";
import { createWorld, EngineInvariantError, timeAt } from "../index";
import { CLOCK_EPOCH } from "./clock";

describe("createWorld", () => {
  it("is deterministic", () => {
    const spec = { files: { "p/a.txt": "a\n" }, cwd: "p" };
    expect(createWorld(spec)).toEqual(createWorld(spec));
  });

  it("builds the learner's machine with default identity and no repositories", () => {
    const world = createWorld();
    const you = world.machines.get("you");
    expect(world.seq).toBe(0);
    expect(world.repos.size).toBe(0);
    expect(you?.cwd).toBe("/home/you");
    expect([...(you?.fs.dirs ?? [])]).toEqual(["/", "/home", "/home/you"]);
    expect(you?.config).toEqual([
      { key: "user.name", value: "Sam Lee" },
      { key: "user.email", value: "sam@example.com" },
      { key: "init.defaultbranch", value: "main" },
    ]);
    expect(world.system).toEqual([]);
  });

  it("places files, their folders, extra folders and the working directory", () => {
    const world = createWorld({
      files: { "p/src/a.ts": "x" },
      dirs: ["empty"],
      cwd: "p/src",
      global: {},
      system: { "core.editor": "nano" },
    });
    const you = world.machines.get("you");
    expect(you?.fs.files.get("/home/you/p/src/a.ts")).toBe("x");
    expect(you?.fs.dirs.has("/home/you/p")).toBe(true);
    expect(you?.fs.dirs.has("/home/you/empty")).toBe(true);
    expect(you?.cwd).toBe("/home/you/p/src");
    expect(you?.config).toBeNull();
    expect(world.system).toEqual([{ key: "core.editor", value: "nano" }]);
  });

  it("rejects config keys Git would reject", () => {
    expect(() => createWorld({ global: { nodot: "x" } })).toThrow(
      EngineInvariantError,
    );
  });
});

describe("clock", () => {
  it("starts at 2026-01-01T00:00:00Z and ticks 60 s per invocation", () => {
    expect(timeAt(0)).toBe(CLOCK_EPOCH);
    expect(CLOCK_EPOCH).toBe(1767225600);
    expect(timeAt(3)).toBe(1767225600 + 180);
  });
});

describe("canonicalKey", () => {
  it.each([
    ["init.defaultBranch", "init.defaultbranch"],
    ["Remote.Origin.URL", "remote.Origin.url"],
    ["branch.feature/x.merge", "branch.feature/x.merge"],
    ["nodot", null],
    [".name", null],
    ["user.", null],
    ["user.1name", null],
  ])("%s -> %s", (key, expected) => {
    expect(canonicalKey(key)).toBe(expected);
  });
});
