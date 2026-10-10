import { describe, expect, it } from "vitest";
import { aim, carryKey, move, pick } from "./pick-and-drop";

const targets = ["a", "b", "c"] as const;

describe("pick and drop", () => {
  it("aims at the first target when picked", () => {
    expect(pick("f", targets)).toEqual({ item: "f", target: "a" });
    expect(pick("f", [])).toEqual({ item: "f", target: null });
  });

  it("moves through the targets and wraps", () => {
    const c = pick("f", targets);
    expect(move(c, targets, 1).target).toBe("b");
    expect(move(c, targets, -1).target).toBe("c");
    expect(move(move(c, targets, -1), targets, 1).target).toBe("a");
    const none = { item: "f", target: null };
    expect(move(none, targets, 1).target).toBe("a");
    expect(move(none, targets, -1).target).toBe("c");
    expect(move(c, [], 1).target).toBeNull();
  });

  it("keeps the same carry when the aim does not change", () => {
    const c = pick("f", targets);
    expect(aim(c, "a")).toBe(c);
    expect(aim(c, null)).toEqual({ item: "f", target: null });
  });

  it("maps keys: arrows and Tab move, Enter drops, Escape cancels", () => {
    expect(carryKey("ArrowDown")).toBe("next");
    expect(carryKey("ArrowLeft")).toBe("previous");
    expect(carryKey("Tab")).toBe("next");
    expect(carryKey("Tab", true)).toBe("previous");
    expect(carryKey("Enter")).toBe("drop");
    expect(carryKey("Escape")).toBe("cancel");
    expect(carryKey("a")).toBeNull();
  });
});
