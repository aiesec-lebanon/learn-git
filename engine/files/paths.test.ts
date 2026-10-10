import { describe, expect, it } from "vitest";
import {
  ancestors,
  baseName,
  displayRelative,
  parentOf,
  relativeTo,
  resolvePath,
} from "./paths";

describe("paths", () => {
  it.each([
    ["/home/you", "p/a.txt", "/home/you/p/a.txt"],
    ["/home/you/p", "../q/./b", "/home/you/q/b"],
    ["/home/you", "/etc//x/", "/etc/x"],
    ["/", "../..", "/"],
    ["/home/you", "", "/home/you"],
  ])("resolvePath(%s, %s)", (cwd, path, expected) => {
    expect(resolvePath(cwd, path)).toBe(expected);
  });

  it("splits parents and names", () => {
    expect(parentOf("/home/you")).toBe("/home");
    expect(parentOf("/home")).toBe("/");
    expect(parentOf("/")).toBe("/");
    expect(baseName("/home/you/a.txt")).toBe("a.txt");
    expect(ancestors("/home/you/a")).toEqual(["/", "/home", "/home/you"]);
    expect(ancestors("/")).toEqual(["/"]);
  });

  it("relates paths", () => {
    expect(relativeTo("/home/you/p", "/home/you/p/a/b")).toBe("a/b");
    expect(relativeTo("/home/you/p", "/home/you/p")).toBe("");
    expect(relativeTo("/home/you/p", "/home/you/pq")).toBeNull();
    expect(relativeTo("/", "/home")).toBe("home");
    expect(displayRelative("/home/you/p/src", "/home/you/p/a.txt")).toBe(
      "../a.txt",
    );
    expect(displayRelative("/home/you/p", "/home/you/p/src/x")).toBe("src/x");
    expect(displayRelative("/", "/home")).toBe("home");
    expect(displayRelative("/home", "/")).toBe("..");
  });
});
