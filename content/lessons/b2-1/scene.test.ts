import { describe, expect, it } from "vitest";
import { countPar, createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B2.1", () => {
  it("is solved under par with commit -am for the second commit", () => {
    const challenge = scene.challenge;
    if (!challenge) throw new Error("no challenge");
    const session = new Session(createWorld(challenge.world));
    session.run('git commit -m "Take cash"');
    session.run('git commit -am "Take cards too"');
    const { world, history } = session.getSnapshot();
    expect(match(world, challenge.target).differences).toEqual([]);
    expect(countPar(history)).toBe(challenge.par - 1);
  });

  it("is not solved by committing every change", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('git commit -am "Everything"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
