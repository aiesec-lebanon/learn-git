import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B3.3", () => {
  it("is not solved by leaving the experiment behind", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git switch --detach HEAD~2");
    session.run('echo "Photos." >> README.md');
    session.run('git commit -am "Try photos"');
    session.run("git switch main");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });

  it("starts the challenge detached, with the experiment unnamed", () => {
    const repo = [...createWorld(scene.challenge?.world).repos.values()][0];
    expect(repo?.head.kind).toBe("detached");
  });
});
