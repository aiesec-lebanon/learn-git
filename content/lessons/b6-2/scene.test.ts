import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { runStep } from "../../define";
import scene from "./scene";

const refsOf = (session: Session) => {
  const { world } = session.getSnapshot();
  const repo = [...world.repos.values()].find((r) => r.machine === "you");
  return new Map<string, string>(repo?.refs ?? []);
};

describe("B6.2", () => {
  it("merges on origin only: main and origin/main stay put until the pull", () => {
    const session = new Session(createWorld(scene.world));
    const [push, open, review, merge] = scene.beats;
    for (const beat of [push, open, review])
      for (const step of beat?.run ?? []) runStep(session, step);
    const before = refsOf(session);
    for (const step of merge?.run ?? []) runStep(session, step);
    const after = refsOf(session);
    expect(after.get("refs/heads/main")).toBe(before.get("refs/heads/main"));
    expect(after.get("refs/remotes/origin/main")).toBe(
      before.get("refs/remotes/origin/main"),
    );
  });

  it("refuses the merge while Sam's change request stands", () => {
    const { yourTurn } = scene;
    const session = new Session(createWorld(yourTurn.world));
    const [push, open] = yourTurn.solution;
    for (const step of [push, open]) if (step) runStep(session, step);
    const [entry] = session.act({
      type: "merge-pull-request",
      repo: "sam/bake-sale",
      number: 1,
    });
    expect(entry?.outcome.output.exitCode).toBe(1);
  });
});
