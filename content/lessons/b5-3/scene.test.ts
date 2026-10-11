import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B5.3", () => {
  it("is refused without an upstream and rejected after Sam pushes first", () => {
    const session = new Session(createWorld(scene.world));
    const [noUpstream, , , rejected, integrate] = scene.beats;
    const errors = (lines: readonly string[] = []) =>
      lines
        .flatMap((line) => session.run(line))
        .map((e) => e.outcome.output.stderr)
        .join("");
    expect(errors(noUpstream?.run)).toContain(
      "fatal: The current branch dark-mode has no upstream branch.",
    );
    for (const beat of scene.beats.slice(1, 3))
      for (const line of beat.run ?? []) session.run(line);
    expect(errors(rejected?.run)).toContain("(fetch first)");
    expect(errors(integrate?.run)).not.toContain("rejected");
  });

  it("is not solved by a push that leaves dark-mode without an upstream", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git push origin dark-mode");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
