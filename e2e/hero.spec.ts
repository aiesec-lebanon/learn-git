import { expect, test } from "./fixtures";

const current = (page: import("@playwright/test").Page) =>
  page
    .getByRole("figure", { name: "An example that runs by itself" })
    .locator('li[aria-current="step"]');

test("the hero holds a still frame under reduced motion until asked to play", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const play = page.getByRole("button", { name: "Play the example" });
  await expect(play).toBeVisible();
  await expect(current(page)).toHaveText("git push");
  await page.waitForTimeout(3500);
  await expect(current(page)).toHaveText("git push");
  await play.click();
  await expect(current(page)).toHaveText("git status", { timeout: 5000 });
});

test("the hero loops with motion and stops on Pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(current(page)).toHaveText("git status", { timeout: 5000 });
  await page.getByRole("button", { name: "Pause the example" }).click();
  const held = await current(page).textContent();
  await page.waitForTimeout(3500);
  await expect(current(page)).toHaveText(held ?? "");
  await expect(
    page.getByRole("button", { name: "Play the example" }),
  ).toBeVisible();
});

test("home fits a phone without sideways scroll @phone", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("figure", { name: "An example that runs by itself" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
