import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B2.1", () => {
  it("is not solved by committing every change", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('git commit -am "Everything"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
