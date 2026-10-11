import { expect, expectAxeClean, test } from "./fixtures";

test("the footer leads to the Field guide and its credits", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Field guide" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Field guide",
  );
  await expect(
    page.getByText("git config set --global user.name", { exact: false }),
  ).toBeVisible();
  const credits = page.getByRole("region", { name: "Credits" });
  await expect(credits).toContainText("Software Freedom Conservancy");
  await expect(credits).toContainText("not affiliated with GitHub");
  await expect(credits).toContainText("progress stays in this browser");
  await expect(page).toHaveTitle(/Field guide/);
  await expectAxeClean(page);
});
