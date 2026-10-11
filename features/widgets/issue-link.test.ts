import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { runStep } from "@/content/define";
import scene from "@/content/lessons/b6-3/scene";
import { linkLines, segments, wouldClose } from "./issue-link.model";

describe("keyword highlighter", () => {
  it("marks closing references and plain mentions", () => {
    expect(segments("See #2. Fixes #3").map((s) => [s.kind, s.text])).toEqual([
      ["text", "See "],
      ["mention", "#2"],
      ["text", ". "],
      ["closes", "Fixes #3"],
    ]);
  });

  it("closes only into the default branch", () => {
    expect(wouldClose("Fixes #3", "main", "main")).toEqual([3]);
    expect(wouldClose("Fixes #3", "docs", "main")).toEqual([]);
    expect(wouldClose("See #3", "main", "main")).toEqual([]);
  });
});

describe("issue link lines", () => {
  it("are pending until the merge, closed after it, inert into another branch", () => {
    const session = new Session(createWorld(scene.world));
    const lines = () => {
      const { world } = session.getSnapshot();
      const repo = [...world.repos.values()].find((r) => r.machine === "you");
      if (!repo) throw new Error("no repository");
      return linkLines(world, repo).map((l) => [
        l.issue.number,
        l.pull.number,
        l.status,
        l.issue.state,
      ]);
    };
    const [anatomy, keywords, merge, defaultOnly] = scene.beats;
    for (const beat of [anatomy, keywords])
      for (const step of beat?.run ?? []) runStep(session, step);
    expect(lines()).toEqual([[3, 4, "pending", "open"]]);
    for (const step of merge?.run ?? []) runStep(session, step);
    expect(lines()).toEqual([[3, 4, "closed", "closed"]]);
    for (const step of defaultOnly?.run ?? []) runStep(session, step);
    expect(lines()).toEqual([
      [3, 4, "closed", "closed"],
      [5, 6, "inert", "open"],
    ]);
  });
});
