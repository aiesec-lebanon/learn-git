import { expect, test } from "./fixtures";
import { LESSON } from "./b1-1";

const next = (page: import("@playwright/test").Page) =>
  page
    .getByRole("region", { name: "Lesson stage" })
    .getByRole("button", { name: "Next" });

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("beats scroll together and animate, then settle", async ({ page }) => {
    await page.goto(LESSON);
    await expect(
      page.getByRole("heading", { name: "The first commit" }),
    ).toBeVisible();
    for (let i = 0; i < 4; i++) await next(page).click();
    await expect(page.getByText("Beat 5 of 5")).toBeVisible();
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every(
          (a) =>
            a.playState !== "running" ||
            a.effect?.getTiming().iterations === Infinity,
        ),
    );
    const stage = page.getByRole("region", { name: "Lesson stage" });
    await expect(
      stage.getByRole("button", { name: /First snapshot of the recipe site/ }),
    ).toBeVisible();
    await expect(
      stage.getByText("README.md: copied into the staging area"),
    ).toHaveCount(0);
  });
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("beats become steps with before and after notes", async ({ page }) => {
    await page.goto(LESSON);
    await expect(
      page.getByRole("heading", { name: "A folder full of copies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The first commit" }),
    ).toBeHidden();
    for (let i = 0; i < 4; i++) await next(page).click();
    await expect(
      page.getByRole("heading", { name: "The first commit" }),
    ).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "A folder full of copies" }),
    ).toBeHidden();
    const stage = page.getByRole("region", { name: "Lesson stage" });
    await expect(
      stage.getByText("README.md: copied into the staging area"),
    ).toBeVisible();
  });
});
