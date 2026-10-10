import { expect, expectAxeClean, test } from "./fixtures";

for (const tag of ["", " @phone"]) {
  test(`home page loads cleanly${tag}`, async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Learn Git");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Learn Git",
    );
    await expect(page.getByRole("contentinfo")).toContainText(
      "by AIESEC Lebanon",
    );
    await expectAxeClean(page);
  });

  test(`unknown pages answer 404 in the shell${tag}`, async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This page is not on the board",
    );
    await expectAxeClean(page);
  });
}

test("the skip link is the first stop and moves to the content", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe passes in the ${scheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await expectAxeClean(page);
  });
}
