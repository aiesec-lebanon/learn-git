import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./security-headers";

describe("contentSecurityPolicy", () => {
  it("allows eval only in development", () => {
    expect(contentSecurityPolicy(false)).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy(true)).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    );
  });

  it("keeps every source on the same origin", () => {
    expect(contentSecurityPolicy(false)).not.toMatch(/https?:/);
  });
});
