import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { confirmation, terminal, YOUR_TURN } from "./b1-1";

async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Tab never reached the target");
}

test("B1.1 can be finished by keyboard alone", async ({ page }) => {
  await page.goto("/");
  await tabTo(page, page.getByRole("link", { name: "New to Git? Start here" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("B1.1");

  await tabTo(page, page.getByRole("button", { name: "Next" }));
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "A snapshot of the whole project" }),
  ).toBeFocused();

  await tabTo(page, terminal(page), 120);
  for (const line of YOUR_TURN) {
    await page.keyboard.type(line);
    await page.keyboard.press("Enter");
  }
  await expect(confirmation(page).first()).toBeVisible();
});
