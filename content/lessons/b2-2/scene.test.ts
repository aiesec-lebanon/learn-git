import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B2.2", () => {
  it("is not solved by discarding everything", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git restore --staged .");
    session.run("git restore .");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
