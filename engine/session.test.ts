import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { Session } from "./session";
import { effectChanges, stateChanges } from "./test/effects-match-state";
import { createWorld } from "./world/create";

const world = () => createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" });

const POOL = [
  "git init",
  "git add .",
  "git commit -m one",
  "echo x >> a.txt",
  "touch b.txt",
  "git status",
  "nope",
  "mkdir d",
];

describe("Session", () => {
  it("keeps the snapshot it started with for hydration", () => {
    const session = new Session(world());
    const initial = session.getSnapshot();
    session.run("git init");
    expect(session.getInitialSnapshot()).toBe(initial);
    expect(session.getSnapshot()).not.toBe(initial);
    expect(initial).toMatchObject({ step: 0, history: [], pending: null });
  });

  it("records one entry per command, with its text", () => {
    const session = new Session(world());
    const ran = session.run("git init && git add 'a.txt'; nope && ls");
    expect(ran.map((e) => e.text)).toEqual([
      "git init",
      "git add a.txt",
      "nope",
    ]);
    const snap = session.getSnapshot();
    expect(snap.step).toBe(3);
    expect(snap.latest).toBe(ran);
    expect(snap.world).toBe(ran.at(-1)?.outcome.world);
  });

  it("previews without recording or notifying", () => {
    const session = new Session(world());
    const listener = vi.fn();
    session.subscribe(listener);
    const before = session.getSnapshot();
    const [entry] = session.preview("git init");
    expect(entry?.outcome.effects.length).toBeGreaterThan(0);
    expect(session.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps the snapshot until something changes and notifies subscribers", () => {
    const session = new Session(world());
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    const first = session.getSnapshot();
    expect(session.getSnapshot()).toBe(first);
    session.run("git init");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot()).not.toBe(first);
    session.rewindTo(1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    session.rewindTo(0);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().world).toBe(first.world);
  });

  it("rewinds to exactly the snapshot after n commands", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...POOL), { maxLength: 12 }),
        fc.nat(),
        (lines, pick) => {
          const session = new Session(world());
          const worlds = [session.getSnapshot().world];
          for (const line of lines) {
            session.run(line);
            worlds.push(session.getSnapshot().world);
          }
          const n = pick % worlds.length;
          session.rewindTo(n);
          const snap = session.getSnapshot();
          expect(snap.world).toBe(worlds[n]);
          expect(snap.step).toBe(n);
          expect(snap.history).toHaveLength(n);
          if (n < lines.length) expect(snap.latest).toEqual([]);
        },
      ),
      { numRuns: 60 },
    );
  });

  it("drops the oldest snapshots past the cap and never rewinds below the floor", () => {
    const session = new Session(world(), { historyCap: 3 });
    session.run("touch 1; touch 2; touch 3; touch 4; touch 5");
    expect(session.getSnapshot()).toMatchObject({ step: 5, floor: 2 });
    session.rewindTo(0);
    const snap = session.getSnapshot();
    expect(snap).toMatchObject({ step: 2, floor: 2, history: [] });
    const files = [...(snap.world.machines.get("you")?.fs.files.keys() ?? [])];
    expect(files).toEqual([
      "/home/you/p/a.txt",
      "/home/you/p/1",
      "/home/you/p/2",
    ]);
  });

  it("exposes the latest command's request as pending", () => {
    const session = new Session(world());
    session.run("git help status");
    expect(session.getSnapshot().pending).toEqual({
      kind: "open-reference",
      entryId: "status",
    });
    session.run("git status");
    expect(session.getSnapshot().pending).toBeNull();
  });
});

describe("effects match state", () => {
  it("derives the same changes a commit emits", () => {
    const session = new Session(world());
    session.run("git init; git add .");
    const before = session.getSnapshot().world;
    const [entry] = session.run("git commit -m one");
    const derived = stateChanges(before, session.getSnapshot().world);
    expect(derived.some((k) => k.startsWith("ref "))).toBe(true);
    expect(effectChanges(entry?.outcome.effects ?? [])).toEqual(derived);
  });
});
