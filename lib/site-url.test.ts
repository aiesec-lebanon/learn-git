import { describe, expect, it } from "vitest";
import { siteOrigin } from "./site-url";

describe("site origin", () => {
  it("prefers the production domain, then the deployment, then localhost", () => {
    expect(
      siteOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "learn-git.vercel.app",
        VERCEL_URL: "learn-git-abc123.vercel.app",
      }).href,
    ).toBe("https://learn-git.vercel.app/");
    expect(siteOrigin({ VERCEL_URL: "learn-git-abc123.vercel.app" }).href).toBe(
      "https://learn-git-abc123.vercel.app/",
    );
    expect(siteOrigin({}).href).toBe("http://localhost:3000/");
  });
});
