import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B3.2", () => {
  it("is not solved by committing the fix on dark-mode", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('echo "<p>Fresh recipes every week.</p>" >> index.html');
    session.run('git commit -am "Promise fresh recipes"');
    session.run("git switch main");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
