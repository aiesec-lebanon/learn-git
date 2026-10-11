import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import { runStep } from "../../define";
import scene, { RECIPES_URL } from "./scene";

describe("B6.1", () => {
  it("shows the README trap: fetch first, then unrelated histories", () => {
    const session = new Session(createWorld(scene.world));
    const [trap] = scene.beats;
    const out = (trap?.run ?? [])
      .flatMap((step) => runStep(session, step))
      .map((e) => e.outcome.output.stderr)
      .join("");
    expect(out).toContain("(fetch first)");
    expect(out).toContain("refusing to merge unrelated histories");
  });

  it("is not solved by a repository created with a README", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.act({ type: "create-repository", name: "recipes", readme: true });
    session.run(`git remote add origin ${RECIPES_URL}`);
    session.run("git push -u origin main");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });

  it("does not accept publishing dark-mode too in the challenge", () => {
    const challenge = scene.challenge;
    const session = new Session(createWorld(challenge.world));
    for (const step of challenge.solution) runStep(session, step);
    session.run("git push origin dark-mode");
    expect(match(session.getSnapshot().world, challenge.target).ok).toBe(false);
  });
});
