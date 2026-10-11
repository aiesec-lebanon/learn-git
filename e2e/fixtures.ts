import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

const ownProtocols = new Set(["data:", "blob:"]);
const failedLoad = "Failed to load resource";
/** WebKit reports a route prefetch cut off by a full navigation this way. */
const abortedPrefetch = /\?_rsc=\S+ due to access control checks\.$/;

export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page, context, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://localhost").origin;
      const problems: string[] = [];
      await page.addInitScript(() =>
        document.addEventListener("securitypolicyviolation", (event) =>
          console.error(`CSP violation: ${event.violatedDirective}`),
        ),
      );
      page.on("console", (message) => {
        const text = message.text();
        if (message.type() === "error" && !text.startsWith(failedLoad)) {
          problems.push(`console: ${text}`);
        }
      });
      page.on("response", (response) => {
        const request = response.request();
        const isPage =
          request.isNavigationRequest() && request.frame() === page.mainFrame();
        if (response.status() >= 400 && !isPage) {
          problems.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      });
      page.on("pageerror", (error) => {
        if (!abortedPrefetch.test(error.message)) {
          problems.push(`page error: ${error.message}`);
        }
      });
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (!ownProtocols.has(url.protocol) && url.origin !== origin) {
          problems.push(`request to another origin: ${request.url()}`);
        }
      });
      await use();
      for (const cookie of await context.cookies()) {
        problems.push(`cookie: ${cookie.name}`);
      }
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function expectAxeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    blocking.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
    ),
  ).toEqual([]);
}
