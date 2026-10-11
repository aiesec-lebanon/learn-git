import { describe, expect, it } from "vitest";
import { countPar } from "../par";
import { narrate } from "../narration/narrate";
import { Session } from "../session";
import { teamWorld } from "../test/network";
import type { ActorScript } from "../types";
import { repoIdFor, repoOf } from "./access";
import { withActors } from "./actors";
import { timeAt } from "./clock";

const SAM = repoIdFor("sam", "/home/sam/s");

const commits = (session: Session) =>
  repoOf(session.getSnapshot().world, SAM).arrival.length;

const script = (id: string, trigger: ActorScript["trigger"]): ActorScript => ({
  id,
  machine: "sam",
  name: "Sam",
  trigger,
  run: [
    `cd /home/sam/s && echo ${id} > ${id}.txt && git add . && git commit -q -m "${id}"`,
  ],
  says: `Sam committed ${id}.`,
});

describe("scripted teammates", () => {
  it("act after a step, once, uncounted and announced", () => {
    const session = new Session(
      withActors(teamWorld(), [script("one", { kind: "after-step", step: 2 })]),
    );
    session.run("ls");
    expect(commits(session)).toBe(0);
    const ran = session.run("pwd");
    expect(ran.map((e) => e.actor ?? "you")).toEqual([
      "you",
      "Sam",
      "Sam",
      "Sam",
      "Sam",
    ]);
    expect(commits(session)).toBe(1);
    const last = ran.at(-1)?.outcome;
    expect(last?.effects[0]).toEqual({
      kind: "actor",
      actor: "Sam",
      says: "Sam committed one.",
    });
    if (last)
      expect(narrate(last.effects, last.world).announcement).toBe(
        "Sam committed one.",
      );
    expect(countPar(session.getSnapshot().history)).toBe(0);
    session.run("ls");
    expect(commits(session)).toBe(1);
  });

  it("act after a matching command or at a time, in schedule order", () => {
    const world = teamWorld();
    const session = new Session(
      withActors(world, [
        script("late", { kind: "at-time", time: timeAt(world.seq + 4) }),
        script("fetch", { kind: "after-command", pattern: "^git status" }),
      ]),
    );
    session.run("ls");
    expect(commits(session)).toBe(0);
    session.run("git status");
    expect(commits(session)).toBe(1);
    session.run("ls; ls; ls");
    expect(commits(session)).toBe(2);
  });

  it("are undone by Rewind and act again afterwards", () => {
    const session = new Session(
      withActors(teamWorld(), [script("one", { kind: "after-step", step: 1 })]),
    );
    session.run("ls");
    expect(commits(session)).toBe(1);
    session.rewindTo(0);
    expect(commits(session)).toBe(0);
    session.run("ls");
    expect(commits(session)).toBe(1);
  });
});
