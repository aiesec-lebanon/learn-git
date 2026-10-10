import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const stored = (prefs: object) =>
  JSON.stringify({ v: 1, resume: null, finished: [], prefs });

/** Reads <html> attributes when <body> starts parsing: after the head script, before React. */
async function attributesAtBodyStart(page: Page, value: string) {
  await page.addInitScript((doc) => {
    localStorage.setItem("learn-git", doc);
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      observer.disconnect();
      const root = document.documentElement;
      root.dataset.seen = `${root.dataset.theme}|${root.dataset.motion}`;
    }).observe(document, { childList: true, subtree: true });
  }, value);
  await page.goto("/");
  return page.locator("html").getAttribute("data-seen");
}

test("applies the stored theme and motion before first paint", async ({
  page,
}) => {
  const seen = await attributesAtBodyStart(
    page,
    stored({ theme: "dark", motion: "reduce" }),
  );
  expect(seen).toBe("dark|reduce");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("follows the system when nothing valid is stored", async ({ page }) => {
  const seen = await attributesAtBodyStart(
    page,
    stored({ theme: "neon", motion: "fast" }),
  );
  expect(seen).toBe("undefined|undefined");
});
