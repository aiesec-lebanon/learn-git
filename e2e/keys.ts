import type { Locator, Page } from "@playwright/test";

const TABBABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";

/** True when Tab left focus on the page's last tabbable element (Firefox does not wrap). */
function stuckAtEnd(page: Page) {
  return page.evaluate((selector) => {
    const w = window as { tabToLast?: Element | null };
    const stayed = w.tabToLast === document.activeElement;
    w.tabToLast = document.activeElement;
    const all = [...document.querySelectorAll(selector)];
    return stayed && all.at(-1) === document.activeElement;
  }, TABBABLE);
}

/** Presses Tab until `target` has focus, walking back with Shift+Tab once stuck at the end. */
export async function tabTo(page: Page, target: Locator, limit = 80) {
  let key = "Tab";
  for (let i = 0; i < limit * 2; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    if ((await stuckAtEnd(page)) && i > 0) key = "Shift+Tab";
    await page.keyboard.press(key);
  }
  throw new Error("Tab never reached the target");
}
