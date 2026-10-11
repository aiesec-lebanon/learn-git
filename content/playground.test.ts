import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { choosePlayground, playgroundHref, PROMPTS } from "./playground";
import { readyLessons } from "./registry";

describe("playground query", () => {
  it("opens an allowlisted world or prompt", () => {
    expect(choosePlayground("recipe-site", null).key).toBe("world:recipe-site");
    const chosen = choosePlayground("recipe-site", "b1-1");
    expect(chosen.key).toBe("prompt:b1-1");
    expect(chosen.prompt?.goal).toBe(PROMPTS[0]?.goal);
  });

  it("offers every ready lesson's Your turn as a prompt", () => {
    expect(PROMPTS.map((p) => p.id)).toEqual(readyLessons().map((l) => l.id));
    expect(PROMPTS.map((p) => p.title)).toContain(
      "B1.3 History is a chain of snapshots",
    );
    expect(choosePlayground(null, "b1-2").prompt?.goal).toContain("typo fix");
  });

  it("offers the Conflict kit: notes fast-forwards, pricing conflicts", () => {
    const kit = choosePlayground("conflict-kit", null);
    expect(kit.starter?.title).toBe("Conflict kit");
    const session = new Session(createWorld(kit.world));
    expect(session.run("git merge notes")[0]?.outcome.output.stdout).toContain(
      "Fast-forward",
    );
    expect(
      session.run("git merge pricing")[0]?.outcome.output.stdout,
    ).toContain("CONFLICT (content): Merge conflict in menu.html");
  });

  it("falls back to the empty folder for anything else", () => {
    for (const value of [null, "", "__proto__", "<script>", "../b1-1"])
      expect(choosePlayground(value, value)).toMatchObject({
        key: "world:empty-folder",
        prompt: null,
      });
  });

  it("encodes the query", () => {
    expect(playgroundHref({ prompt: "b1-1" })).toBe("/playground?prompt=b1-1");
  });
});
