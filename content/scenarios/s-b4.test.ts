import { describe, expect, it } from "vitest";
import { createWorld, mergeBlockers, Session } from "@/engine";
import { writeFile } from "../define";
import { MENU_AGREED } from "../worlds/bake-sale";
import { actsReached } from "./acts";
import scene from "./s-b4";

const start = () => new Session(createWorld(scene.world));

const blockers = (session: Session) => {
  const { world } = session.getSnapshot();
  const pull = world.hub?.repos.get("sam/bake-sale")?.pulls[0];
  if (!pull) throw new Error("no pull request");
  return mergeBlockers(world, "sam/bake-sale", pull);
};

describe("S-B4", () => {
  it("starts with the pull request blocked by conflicts", () => {
    const session = start();
    expect(blockers(session).join(" ")).toContain("conflicts");
    const [merge] = session.act({
      type: "merge-pull-request",
      repo: "sam/bake-sale",
      number: 1,
    });
    expect(merge?.outcome.output.exitCode).toBe(1);
  });

  it("does not count merging the wrong way round, and Rewind takes it back", () => {
    const session = start();
    session.run("git fetch");
    const fetched = session.getSnapshot().history.length;
    session.run("git switch main");
    session.run("git merge price-fix");
    session.run("git merge origin/main");
    session.run(writeFile("menu.html", MENU_AGREED));
    session.run("git add menu.html");
    session.run('git commit -m "Merge"');
    expect(actsReached(scene, session.getSnapshot().world)).toBe(1);
    session.rewindTo(fetched);
    const { world } = session.getSnapshot();
    const repo = [...world.repos.values()].find((r) => r.machine === "you");
    expect(repo?.head).toMatchObject({ ref: "refs/heads/price-fix" });
    expect(actsReached(scene, world)).toBe(1);
  });
});
