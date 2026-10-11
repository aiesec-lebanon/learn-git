import { describe, expect, it } from "vitest";
import { canonicalKey } from "../config/keys";
import { createWorld, EngineInvariantError, runLine, timeAt } from "../index";
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

  it("runs the setup commands after placing the files", () => {
    const world = createWorld({
      files: { "p/a.txt": "a\n" },
      cwd: "p",
      setup: [
        "git init",
        "git add .",
        'git commit -m "First"',
        "echo b > a.txt",
      ],
    });
    expect(world.seq).toBe(4);
    expect(world.repos.size).toBe(1);
    expect(world.machines.get("you")?.fs.files.get("/home/you/p/a.txt")).toBe(
      "b\n",
    );
    expect(() => createWorld({ setup: ["git commit"] })).toThrow(
      EngineInvariantError,
    );
  });

  it("takes Hub actions in the setup as the named account", () => {
    const world = createWorld({
      hub: { "sam/site": {} },
      setup: [
        {
          machine: "sam",
          hub: { type: "open-issue", repo: "sam/site", title: "Broken" },
        },
      ],
    });
    expect(world.hub?.repos.get("sam/site")?.issues[0]).toMatchObject({
      number: 1,
      author: "sam",
    });
    expect(() =>
      createWorld({
        hub: {},
        setup: [
          {
            machine: "you",
            hub: { type: "open-issue", repo: "sam/site", title: "x" },
          },
        ],
      }),
    ).toThrow(EngineInvariantError);
  });

  it("protects Hub branches only once the setup has run", () => {
    const url = "https://hub.test/you/site.git";
    const world = createWorld({
      hub: {
        "you/site": { rules: [{ branch: "main", requirePullRequest: true }] },
      },
      setup: [
        `git clone -q ${url}`,
        "cd site",
        "echo a > a.txt && git add a.txt && git commit -q -m one",
        "git push -q",
      ],
    });
    expect(world.hub?.repos.get("you/site")?.rules).toHaveLength(1);
    const pushed = runLine(
      world,
      "echo b >> a.txt && git commit -q -am two && git push -q",
    );
    expect(pushed.outcomes.at(-1)?.output.exitCode).toBe(1);
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
