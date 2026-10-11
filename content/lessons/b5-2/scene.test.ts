import { describe, expect, it } from "vitest";
import { countPar, createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B5.2", () => {
  it("fetches without touching main, then stops a divergent pull", () => {
    const session = new Session(createWorld(scene.world));
    const [fetch, merge, pull, diverged] = scene.beats;
    const out = (lines: readonly string[] = []) =>
      lines
        .flatMap((line) => session.run(line))
        .filter((e) => !e.actor)
        .map((e) => e.outcome.output.stdout + e.outcome.output.stderr)
        .join("");
    expect(out(fetch?.run)).toContain(
      "Your branch is behind 'origin/main' by 1 commit",
    );
    expect(out(merge?.run)).toContain("Fast-forward");
    expect(out(pull?.run)).toContain("Fast-forward");
    expect(out(diverged?.run)).toContain(
      "fatal: Need to specify how to reconcile divergent branches.",
    );
  });

  it("is solved under par by git pull --no-rebase", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git pull --no-rebase");
    const { world, history } = session.getSnapshot();
    expect(match(world, scene.yourTurn.target).differences).toEqual([]);
    expect(countPar(history)).toBe(1);
  });

  it("is not solved by fetching alone", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git fetch");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
