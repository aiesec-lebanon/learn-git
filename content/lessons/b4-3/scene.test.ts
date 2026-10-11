import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import { hunksOf, parseConflicts } from "@/features/conflict/model";
import scene from "./scene";

describe("B4.3", () => {
  it("shows one conflict hunk with the HEAD and pricing labels", () => {
    const session = new Session(createWorld(scene.world));
    session.run("git merge pricing");
    const [cat] = session.run("cat menu.html");
    const [hunk] = hunksOf(parseConflicts(cat?.outcome.output.stdout ?? ""));
    expect(hunk?.labels).toMatchObject({ ours: "HEAD", theirs: "pricing" });
    expect(hunk?.ours).toContain("$3");
    expect(hunk?.theirs).toContain("$5");
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
