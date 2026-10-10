import { describe, expect, it } from "vitest";
import { countPar, createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B1.2", () => {
  it("is solved under par by a commit with a pathspec", () => {
    const challenge = scene.challenge;
    if (!challenge) throw new Error("no challenge");
    const session = new Session(createWorld(challenge.world));
    session.run('git commit -m "Fix typo" README.md');
    const { world, history } = session.getSnapshot();
    expect(match(world, challenge.target).differences).toEqual([]);
    expect(countPar(history)).toBe(challenge.par - 1);
  });

  it("is not solved by committing everything", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('git commit -am "Everything"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
