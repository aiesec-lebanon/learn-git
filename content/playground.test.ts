import { describe, expect, it } from "vitest";
import { choosePlayground, playgroundHref, PROMPTS } from "./playground";

describe("playground query", () => {
  it("opens an allowlisted world or prompt", () => {
    expect(choosePlayground("recipe-site", null).key).toBe("world:recipe-site");
    const chosen = choosePlayground("recipe-site", "b1-1");
    expect(chosen.key).toBe("prompt:b1-1");
    expect(chosen.prompt?.goal).toBe(PROMPTS[0]?.goal);
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
