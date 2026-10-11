import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { runStep } from "../define";
import { actsReached } from "./acts";
import scene from "./s-b1";

describe("S-B1 detours", () => {
  it("refuses a push to the protected main, then hints at -u for the new branch", () => {
    const [, path] = scene.experts;
    const session = new Session(createWorld(scene.world));
    const stderr = path.solution
      .slice(0, 7)
      .flatMap((step) => runStep(session, step))
      .map((e) => e.outcome.output.stderr)
      .join("");
    expect(stderr).toContain("protected branch");
    expect(stderr).toContain("has no upstream branch");
    expect(actsReached(scene, session.getSnapshot().world)).toBe(0);
  });

  it("does not merge before Sam approves", () => {
    const [path] = scene.experts;
    const session = new Session(createWorld(scene.world));
    for (const step of path.solution.slice(0, 7)) runStep(session, step);
    const [merge] = session.act({
      type: "merge-pull-request",
      repo: "sam/bake-sale",
      number: 4,
    });
    expect(merge?.outcome.output.exitCode).toBe(1);
    expect(actsReached(scene, session.getSnapshot().world)).toBe(1);
  });
});
