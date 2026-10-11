import type { Locator, Page } from "@playwright/test";

/** True when focus is on the same element as at the previous call. */
function focusStayed(page: Page) {
  return page.evaluate(() => {
    const w = window as { tabToLast?: Element | null };
    const stayed = w.tabToLast === document.activeElement;
    w.tabToLast = document.activeElement;
    return stayed;
  });
}

/**
 * Presses Tab until `target` has focus. Firefox does not wrap past the last
 * element, so once focus stops moving it walks back with Shift+Tab.
 */
export async function tabTo(page: Page, target: Locator, limit = 80) {
  let key = "Tab";
  for (let i = 0; i < limit * 2; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    if ((await focusStayed(page)) && i > 0) key = "Shift+Tab";
    await page.keyboard.press(key);
  }
  throw new Error("Tab never reached the target");
}
