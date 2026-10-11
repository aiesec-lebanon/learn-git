import { expect, test } from "./fixtures";
import { confirmation, terminal, YOUR_TURN } from "./b1-1";
import { tabTo } from "./keys";

test("B1.1 can be finished by keyboard alone", async ({ page }) => {
  await page.goto("/orientation");
  await tabTo(page, page.getByRole("link", { name: "Start B1.1" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("B1.1");
  // The route change moves focus to the main content; tabbing starts after it.
  await expect(page.locator("#main")).toBeFocused();

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
