import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { stageFiles } from "./files";
import { createSessionRegistry } from "./session-registry";

const world = () =>
  createWorld({ files: { "p/a.txt": "a\n", "p/b.txt": "b\n" }, cwd: "p" });

describe("session registry", () => {
  it("reuses sessions by key and drops the least recently used", () => {
    const registry = createSessionRegistry(2);
    const a = registry.get("a", () => new Session(world()));
    expect(registry.get("a", () => new Session(world()))).toBe(a);
    registry.get("b", () => new Session(world()));
    registry.get("a", () => new Session(world()));
    registry.get("c", () => new Session(world()));
    expect(registry.latest()?.key).toBe("c");
    expect(registry.get("a", () => new Session(world()))).toBe(a);
    const b2 = new Session(world());
    expect(registry.get("b", () => b2)).toBe(b2);
    for (const key of ["a", "b", "c"]) registry.delete(key);
    expect(registry.latest()).toBeNull();
  });
});

describe("stageFiles", () => {
  const run = (...lines: string[]) => {
    const s = new Session(world());
    for (const line of lines) s.run(line);
    return stageFiles(s.getSnapshot().world);
  };

  it("shows plain files and no staging area before git init", () => {
    expect(run()).toMatchObject({
      repo: null,
      index: null,
      worktree: [
        { path: "a.txt", state: null },
        { path: "b.txt", state: null },
      ],
    });
  });

  it("gives every file a state in both areas", () => {
    const files = run(
      "git init && git add . && git commit -m one",
      "echo x >> a.txt; rm b.txt; touch c.txt; echo d > d.txt; git add d.txt",
    );
    expect(files.worktree).toEqual([
      { path: "a.txt", state: "modified" },
      { path: "b.txt", state: "deleted" },
      { path: "c.txt", state: "untracked" },
      { path: "d.txt", state: "unmodified" },
    ]);
    expect(files.index).toEqual([
      { path: "a.txt", state: "unmodified" },
      { path: "b.txt", state: "unmodified" },
      { path: "d.txt", state: "added" },
    ]);
    const staged = run(
      "git init && git add . && git commit -m one",
      "echo x >> a.txt; rm b.txt; git add .",
    );
    expect(staged.index).toEqual([
      { path: "a.txt", state: "modified" },
      { path: "b.txt", state: "deleted" },
    ]);
  });

  it("marks a file staged and then edited again as split", () => {
    const files = run(
      "git init && git add . && git commit -m one",
      "echo x >> a.txt; git add a.txt; echo y >> a.txt",
    );
    expect(files.worktree[0]).toEqual({
      path: "a.txt",
      state: "modified",
      split: true,
    });
    expect(files.index?.[0]).toEqual({
      path: "a.txt",
      state: "modified",
      split: true,
    });
  });
});
