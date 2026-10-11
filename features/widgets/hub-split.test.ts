import { describe, expect, it } from "vitest";
import { createWorld, Session, type World } from "@/engine";
import { recipeSiteHistory } from "@/content/worlds/recipe-site";
import { hubSide, twoRootsView } from "./hub-split.model";

const URL = "https://hub.test/you/recipes.git";

const mine = (world: World) => {
  const repo = [...world.repos.values()].find((r) => r.machine === "you");
  if (!repo) throw new Error("no repository");
  return repo;
};

describe("hub split", () => {
  it("shows nothing until origin points at a Hub repository", () => {
    const session = new Session(createWorld({ ...recipeSiteHistory, hub: {} }));
    session.act({ type: "create-repository", name: "recipes" });
    const { world } = session.getSnapshot();
    expect(hubSide(world, mine(world))).toBeNull();
  });

  it("lists origin's main newest first, marking commits you have", () => {
    const session = new Session(createWorld({ ...recipeSiteHistory, hub: {} }));
    session.act({ type: "create-repository", name: "recipes", readme: true });
    session.run(`git remote add origin ${URL}`);
    let { world } = session.getSnapshot();
    expect(hubSide(world, mine(world))?.commits).toEqual([
      expect.objectContaining({ subject: "Initial commit", local: false }),
    ]);
    session.run("git fetch");
    ({ world } = session.getSnapshot());
    const side = hubSide(world, mine(world));
    expect(side?.repo).toBe("you/recipes");
    expect(side?.branch).toBe("main");
    expect(side?.commits.map((c) => c.local)).toEqual([true]);
  });

  it("draws two root commits after fetching an unrelated README", () => {
    const view = twoRootsView();
    expect(view.commits).toHaveLength(4);
    expect(view.labels.map((l) => l.name)).toContain("draft/main");
  });
});
