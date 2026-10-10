import { securityHeaders } from "../lib/security-headers";
import { expect, test } from "./fixtures";

for (const [path, status] of [
  ["/", 200],
  ["/no-such-page", 404],
] as const) {
  test(`security headers on ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(status);
    const headers = await response?.allHeaders();
    for (const { key, value } of securityHeaders(false)) {
      expect(headers?.[key.toLowerCase()]).toBe(value);
    }
    expect(headers?.["x-powered-by"]).toBeUndefined();
  });
}
