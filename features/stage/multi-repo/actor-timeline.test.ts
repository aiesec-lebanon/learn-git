import { describe, expect, it } from "vitest";
import { createWorld, Session, timeAt, withActors } from "@/engine";
import { timelineItems, triggerText } from "./actor-timeline.model";

const world = withActors(
  createWorld({
    machines: {
      sam: { global: { "user.name": "Sam", "user.email": "s@t.test" } },
    },
    setup: [{ machine: "sam", run: "mkdir s" }],
  }),
  [
    {
      id: "a",
      machine: "sam",
      name: "Sam",
      trigger: { kind: "after-step", step: 2 },
      run: ["cd s && touch a.txt"],
      says: "Sam made a file.",
    },
    {
      id: "b",
      machine: "sam",
      name: "Sam",
      trigger: { kind: "at-time", time: timeAt(60) },
      run: ["cd s && touch b.txt"],
    },
  ],
);

describe("the teammate timeline", () => {
  it("lists what comes next and when", () => {
    expect(timelineItems(world)).toEqual([
      {
        id: "a",
        name: "Sam",
        what: "Sam made a file.",
        when: "after your second command",
        state: "next",
      },
      {
        id: "b",
        name: "Sam",
        what: "cd s && touch b.txt",
        when: "at 01:00",
        state: "waiting",
      },
    ]);
    expect(
      triggerText({
        id: "c",
        machine: "sam",
        name: "Sam",
        trigger: { kind: "after-command", pattern: "x" },
        run: [],
        when: "after you clone",
      }),
    ).toBe("after you clone");
  });

  it("pauses teammates and steps them one at a time", () => {
    const session = new Session(world);
    session.setActorsPaused(true);
    session.run("ls");
    session.run("ls");
    expect(timelineItems(session.getSnapshot().world)[0]?.state).toBe("next");
    const acted = session.stepActor();
    expect(acted.map((e) => e.actor)).toEqual(["Sam", "Sam"]);
    expect(session.getSnapshot().actorsPaused).toBe(true);
    expect(
      timelineItems(session.getSnapshot().world).map((i) => i.state),
    ).toEqual(["done", "next"]);
  });
});
