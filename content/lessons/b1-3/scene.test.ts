import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B1.3", () => {
  it("is not solved by one commit with both files", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('git add . && git commit -m "Both"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
