import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test("track, lesson and capstone links reach the right page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See the Beginner track" }).click();
  await expect(heading(page)).toHaveText("Beginner track");

  await page.getByRole("link", { name: "B1.1 Save points" }).click();
  await expect(heading(page)).toContainText("B1.1");

  const course = page.getByRole("navigation", { name: "Course" });
  await course.getByRole("link", { name: "Next: Capstone B1" }).click();
  await expect(heading(page)).toHaveText("Capstone B1");

  await course.getByRole("link", { name: /^Previous: B1\.1/ }).click();
  await expect(heading(page)).toContainText("B1.1");

  await course.getByRole("link", { name: "All chapters" }).click();
  await expect(heading(page)).toHaveText("Beginner track");
});
