import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B4.2", () => {
  it("shows both parents of the merge commit", () => {
    const session = new Session(createWorld(scene.world));
    const shown: string[] = [];
    for (const beat of scene.beats)
      for (const line of beat.run ?? [])
        for (const entry of session.run(line))
          if (beat.id === "parents") shown.push(entry.outcome.output.stdout);
    expect(shown.join("")).toMatch(/^Merge: \w+ \w+$/m);
    expect(shown.join("")).toContain("Merge branch 'footer'");
  });

  it("is not solved by a fast-forward of footer onto main", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git switch footer");
    session.run("git merge main");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
