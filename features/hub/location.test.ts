import { describe, expect, it } from "vitest";
import { addressOf, HubNavigator, type HubLocation } from "./location";

describe("Hub addresses", () => {
  it("reads like a hosting site under hub.test", () => {
    const cases: [HubLocation, string][] = [
      [{ page: "home" }, "hub.test"],
      [{ page: "new" }, "hub.test/new"],
      [{ page: "code", repo: "sam/shop" }, "hub.test/sam/shop"],
      [
        { page: "code", repo: "sam/shop", ref: "dev" },
        "hub.test/sam/shop/tree/dev",
      ],
      [
        {
          page: "code",
          repo: "sam/shop",
          ref: "main",
          path: "docs/a.md",
          file: true,
        },
        "hub.test/sam/shop/blob/main/docs/a.md",
      ],
      [{ page: "branches", repo: "sam/shop" }, "hub.test/sam/shop/branches"],
      [{ page: "commits", repo: "sam/shop" }, "hub.test/sam/shop/commits"],
      [
        { page: "commits", repo: "sam/shop", ref: "dev" },
        "hub.test/sam/shop/commits/dev",
      ],
      [
        { page: "commit", repo: "sam/shop", oid: "abcdef0123" },
        "hub.test/sam/shop/commit/abcdef0",
      ],
      [{ page: "pulls", repo: "sam/shop" }, "hub.test/sam/shop/pulls"],
      [{ page: "compare", repo: "sam/shop" }, "hub.test/sam/shop/compare"],
      [
        { page: "compare", repo: "sam/shop", base: "main", head: "dev" },
        "hub.test/sam/shop/compare/main...dev",
      ],
      [
        { page: "pull", repo: "sam/shop", number: 2 },
        "hub.test/sam/shop/pull/2",
      ],
      [
        { page: "pull", repo: "sam/shop", number: 2, tab: "files" },
        "hub.test/sam/shop/pull/2/files",
      ],
      [{ page: "issues", repo: "sam/shop" }, "hub.test/sam/shop/issues"],
      [{ page: "new-issue", repo: "sam/shop" }, "hub.test/sam/shop/issues/new"],
      [
        { page: "issue", repo: "sam/shop", number: 3 },
        "hub.test/sam/shop/issues/3",
      ],
    ];
    for (const [at, address] of cases) expect(addressOf(at)).toBe(address);
  });
});

describe("Hub navigation", () => {
  it("goes back and forward inside the sandbox", () => {
    const nav = new HubNavigator({ page: "home" });
    let calls = 0;
    const stop = nav.subscribe(() => calls++);
    nav.goBack();
    expect(nav.getSnapshot()).toEqual({
      at: { page: "home" },
      canBack: false,
      canForward: false,
    });
    nav.go({ page: "new" });
    nav.go({ page: "branches", repo: "a/b" });
    nav.goBack();
    expect(nav.getSnapshot()).toEqual({
      at: { page: "new" },
      canBack: true,
      canForward: true,
    });
    nav.goForward();
    expect(nav.getSnapshot().at).toEqual({ page: "branches", repo: "a/b" });
    nav.goForward();
    nav.goBack();
    nav.go({ page: "home" });
    expect(nav.getSnapshot().canForward).toBe(false);
    stop();
    nav.goBack();
    expect(calls).toBe(6);
  });
});
