import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

const UP_TO_DATE = "Your branch is up to date with 'origin/main'.";

describe("B5.1", () => {
  it("still says up to date after Sam pushes, because origin/main stays put", () => {
    const session = new Session(createWorld(scene.world));
    const [clone, origin, lastContact] = scene.beats;
    for (const line of [...(clone?.run ?? []), ...(origin?.run ?? [])])
      session.run(line);
    const entries = (lastContact?.run ?? []).flatMap((line) =>
      session.run(line),
    );
    const sam = entries.findIndex((e) => e.actor);
    const after = entries.slice(sam + 1).find((e) => e.text === "git status");
    expect(sam).toBeGreaterThan(0);
    expect(after?.outcome.output.stdout).toContain(UP_TO_DATE);
  });

  it("is not solved by cloning without a local docs", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    for (const line of scene.yourTurn.solution.slice(0, 2)) session.run(line);
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
