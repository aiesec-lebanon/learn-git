import { expect, test } from "./fixtures";
import {
  expectDone,
  expectedCommitId,
  LESSON,
  typeCommands,
  YOUR_TURN,
} from "./b1-1";

test("a newcomer finishes B1.1 and resumes where they left off", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "New to Git? Start here" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Orientation",
  );
  await page.getByRole("link", { name: "Start B1.1" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "B1.1 Save points for a whole project",
  );
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeVisible();

  await typeCommands(page, YOUR_TURN);
  await expectDone(page);
  const id = expectedCommitId();
  await expect(
    page.getByRole("log", { name: "Terminal output" }),
  ).toContainText(`[main (root-commit) ${id}] First snapshot`);
  const path = page.locator("details", { hasText: "Your path" });
  await path.getByText(/^Your path/).click();
  await expect(path.getByText("git init", { exact: true })).toBeVisible();

  await page.reload();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Continue where you left off" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(`${LESSON}#step-5`);
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeFocused();
});

test("resumes at the beat the learner reached", async ({ page }) => {
  await page.goto(LESSON);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Beat 3 of 5")).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "git init creates the repository" }),
  ).toBeFocused();
});

test("an unknown lesson answers 404", async ({ page }) => {
  const response = await page.goto("/learn/b9-9");
  expect(response?.status()).toBe(404);
});
