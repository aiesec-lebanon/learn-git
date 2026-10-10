import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorld, Session } from "@/engine";
import { announcementFor } from "./announcement";
import { createAnnouncerQueue } from "./queue";

describe("announcer queue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("clears then sets each message, one at a time, so repeats are spoken", () => {
    const writes: string[] = [];
    const queue = createAnnouncerQueue((t) => writes.push(t));
    queue.say("Nothing changed.");
    queue.say("Nothing changed.");
    queue.say("  ");
    expect(writes).toEqual([""]);
    vi.runAllTimers();
    expect(writes).toEqual(["", "Nothing changed.", "", "Nothing changed."]);
  });

  it("drops the oldest waiting messages and stops on dispose", () => {
    const writes: string[] = [];
    const queue = createAnnouncerQueue((t) => writes.push(t));
    for (const m of ["a", "b", "c", "d", "e"]) queue.say(m);
    vi.runAllTimers();
    expect(writes.filter(Boolean)).toEqual(["a", "c", "d", "e"]);
    queue.say("f");
    queue.dispose();
    vi.runAllTimers();
    expect(writes.at(-1)).toBe("");
  });
});

describe("announcementFor", () => {
  it("speaks the summary, with Git's first line on a refusal", () => {
    const s = new Session(
      createWorld({ files: { "p/a.txt": "a\n" }, cwd: "p" }),
    );
    expect(announcementFor(s.run("git status"))).toMatch(
      /^fatal: not a git repository .* Nothing changed\. This folder is not inside a Git repository\.$/,
    );
    expect(announcementFor(s.run("git init"))).not.toContain("fatal");
    expect(announcementFor(s.run("edit notes.txt"))).toBe(
      "The editor opened for notes.txt.",
    );
  });
});
