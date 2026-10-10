import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { bootstrapScript } from "./bootstrap";

function run(stored: string | null | (() => never)) {
  const attributes = new Map<string, string>([["data-theme", "stale"]]);
  const documentElement = {
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
  };
  const localStorage = {
    getItem: typeof stored === "function" ? stored : () => stored,
  };
  runInNewContext(bootstrapScript, {
    document: { documentElement },
    localStorage,
  });
  return Object.fromEntries(attributes);
}

const doc = (prefs: unknown, v = 1) => JSON.stringify({ v, prefs });

describe("bootstrapScript", () => {
  it("applies a stored theme and reduced motion", () => {
    expect(run(doc({ theme: "dark", motion: "reduce" }))).toEqual({
      "data-theme": "dark",
      "data-motion": "reduce",
    });
    expect(run(doc({ theme: "light", motion: "system" }))).toEqual({
      "data-theme": "light",
    });
  });

  it("follows the system for missing, unknown or newer documents", () => {
    expect(run(null)).toEqual({});
    expect(run(doc({ theme: "system" }))).toEqual({});
    expect(run(doc({ theme: '"><script>', motion: "fast" }))).toEqual({});
    expect(run(doc({ theme: "dark" }, 2))).toEqual({});
  });

  it("never throws on corrupt or blocked storage", () => {
    expect(run("{not json")).toEqual({ "data-theme": "stale" });
    expect(
      run(() => {
        throw new Error("SecurityError");
      }),
    ).toEqual({ "data-theme": "stale" });
  });
});
