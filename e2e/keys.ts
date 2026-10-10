import type { Locator, Page } from "@playwright/test";

/** Presses Tab until `target` has focus. */
export async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Tab never reached the target");
}
