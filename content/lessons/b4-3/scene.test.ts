import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B4.3", () => {
  it("shows one conflict hunk with the HEAD and pricing labels", () => {
    const session = new Session(createWorld(scene.world));
    session.run("git merge pricing");
    const [cat] = session.run("cat menu.html");
    expect(cat?.outcome.output.stdout).toContain(
      [
        "<<<<<<< HEAD",
        "  <li>Lemon cake: $3</li>",
        "=======",
        "  <li>Lemon cake: $5</li>",
        ">>>>>>> pricing",
      ].join("\n"),
    );
  });

  it("is not solved by committing the markers", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git merge pricing");
    session.run("git add menu.html");
    session.run(`git commit -m "Merge branch 'pricing'"`);
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
