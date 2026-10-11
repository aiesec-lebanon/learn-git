import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { runStep } from "@/content/define";
import scene from "@/content/lessons/b6-2/scene";
import { pullSync } from "./pull-sync.model";

const syncOf = (session: Session) => {
  const { world } = session.getSnapshot();
  const repo = [...world.repos.values()].find((r) => r.machine === "you");
  if (!repo) throw new Error("no repository");
  return pullSync(world, repo);
};

describe("pull sync", () => {
  it("places each commit of the pull request, the merge on origin only until the pull", () => {
    const { yourTurn } = scene;
    const session = new Session(createWorld(yourTurn.world));
    expect(syncOf(session)?.pull).toBeNull();
    const steps = [...yourTurn.solution];
    const upTo = (n: number) => steps.splice(0, n);
    for (const step of upTo(2)) runStep(session, step);
    expect(syncOf(session)?.pull).toMatchObject({
      number: 1,
      state: "open",
      head: "dark-mode",
    });
    for (const step of upTo(4)) runStep(session, step);
    const merged = syncOf(session);
    expect(merged?.pull?.state).toBe("merged");
    expect(merged?.commits.map((c) => [c.subject, c.local, c.origin])).toEqual([
      ["Merge pull request #1 from sam/dark-mode", false, true],
      ["Colour the headings", true, true],
      ["Add a dark theme", true, true],
    ]);
    for (const step of steps) runStep(session, step);
    expect(syncOf(session)?.commits[0]?.local).toBe(true);
  });
});
