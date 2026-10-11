import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B1.2", () => {
  it("is not solved by committing everything", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('git commit -am "Everything"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
