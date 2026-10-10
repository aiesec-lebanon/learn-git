import { expect, expectAxeClean, test } from "./fixtures";

for (const tag of ["", " @phone"]) {
  test(`home page loads cleanly${tag}`, async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expectAxeClean(page);
  });
}
