import { describe, expect, it } from "vitest";
import { EngineInvariantError } from "./errors";
import { resume } from "./execute";
import { runLine } from "./run";
import { Session } from "./session";
import { machineOf } from "./world/access";
import { createWorld } from "./world/create";

const FILE = "/home/you/p/notes.txt";
const world = () =>
  createWorld({ files: { "p/a.txt": "a\n" }, dirs: ["p/d"], cwd: "p" });

describe("editors as interaction requests", () => {
  it("waits for the commit message, then commits on resume", () => {
    const session = new Session(world());
    session.run("git init -q && git add a.txt");
    session.run("git commit && git log");
    const waiting = session.getSnapshot();
    expect(waiting.latest.map((e) => e.text)).toEqual(["git commit"]);
    expect(waiting.pending).toMatchObject({
      kind: "editor",
      purpose: "commit-message",
      file: ".git/COMMIT_EDITMSG",
    });
    expect(waiting.world.pending?.argv).toEqual(["git", "commit"]);
    session.resume("Add a\n# ignored\n");
    const done = session.getSnapshot();
    expect(done.pending).toBeNull();
    expect(done.step).toBe(waiting.step);
    expect(done.latest[0]?.outcome.output.stdout).toMatch(
      /^\[main \(root-commit\) [0-9a-f]{7}\] Add a\n/,
    );
    expect(done.latest[0]?.outcome.meta.counted).toBe(true);
    expect(done.world.pending).toBeUndefined();
    session.resume("ignored");
    expect(session.getSnapshot()).toBe(done);
  });

  it("aborts when the editor closes without a message", () => {
    const session = new Session(world());
    session.run("git init -q && git add a.txt");
    session.run("git commit");
    session.resume(null);
    const out = session.getSnapshot().latest[0]?.outcome.output;
    expect(out?.stderr).toBe("Aborting commit due to empty commit message.\n");
    expect(out?.exitCode).toBe(1);
  });

  it("rewinds a waiting command away and abandons it on the next command", () => {
    const session = new Session(world());
    session.run("git init -q && git add a.txt");
    session.run("git commit");
    session.rewindTo(2);
    expect(session.getSnapshot().pending).toBeNull();
    session.run("git commit");
    session.run("ls");
    const snap = session.getSnapshot();
    expect(snap.pending).toBeNull();
    expect(snap.world.pending).toBeUndefined();
  });

  it("edits a file through the sandbox editor", () => {
    let ran = runLine(world(), "edit notes.txt");
    expect(ran.outcomes[0]?.request).toEqual({
      kind: "editor",
      purpose: "file",
      file: "notes.txt",
      initial: "",
    });
    const written = resume(ran.world, "hello\n");
    expect(machineOf(written.world).fs.files.get(FILE)).toBe("hello\n");
    expect(written.effects).toEqual([
      {
        kind: "files-changed",
        machine: "you",
        changes: [{ path: FILE, change: "added", node: "file" }],
      },
    ]);
    ran = runLine(written.world, "edit notes.txt");
    expect(ran.outcomes[0]?.request).toMatchObject({ initial: "hello\n" });
    expect(resume(ran.world, "hello\n").effects).toEqual([]);
    expect(resume(ran.world, null).world.machines).toBe(ran.world.machines);
  });

  it.each([
    ["edit", "edit: usage: edit <file> (opens the sandbox editor)\n"],
    ["edit a b", "edit: usage: edit <file> (opens the sandbox editor)\n"],
    ["edit d", "edit: 'd': Is a directory\n"],
    ["edit no/x", "edit: 'no/x': No such file or directory\n"],
    [
      "edit .git/config",
      "not simulated here: files inside .git (Git's own storage)\n",
    ],
  ])("%s", (line, stderr) => {
    expect(runLine(world(), line).outcomes[0]?.output.stderr).toBe(stderr);
  });

  it("refuses to resume when nothing waits", () => {
    expect(() => resume(world(), "x")).toThrow(EngineInvariantError);
  });
});
