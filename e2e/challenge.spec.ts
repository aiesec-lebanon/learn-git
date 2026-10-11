import { expect, test } from "./fixtures";

test("challenge mode is off by default, then adds puzzles that report par", async ({
  page,
}) => {
  await page.goto("/learn/b1-2");
  await expect(page.getByRole("heading", { name: "Wrap" })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Puzzle" })).toHaveCount(0);
  await page.goto("/challenges");
  await expect(page.getByText(/challenge mode, which is off/)).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).last().click();
  await page
    .getByRole("checkbox", { name: /^Add a puzzle to each lesson/ })
    .check();
  await page.getByRole("link", { name: "All puzzles by chapter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Puzzles");
  await page
    .getByRole("link", { name: "B1.2 Three places your work lives" })
    .click();

  const puzzle = page.getByRole("region", { name: "Puzzle" });
  const input = puzzle.getByRole("textbox", { name: /^Command in/ });
  for (const line of ["git add README.md", 'git commit -m "Fix typo"']) {
    await input.fill(line);
    await input.press("Enter");
  }
  await expect(
    puzzle.getByText("Solved in 2 · par 2", { exact: true }),
  ).toBeVisible();
  const replay = puzzle.getByRole("slider", {
    name: "Step through both paths",
  });
  await expect(replay).toHaveAttribute("aria-valuetext", /^Step 2 of 2/);
  await replay.focus();
  await page.keyboard.press("Home");
  await expect(replay).toHaveAttribute("aria-valuetext", /^Step 0 of 2/);

  const stored = await page.evaluate(() => localStorage.getItem("learn-git"));
  expect(Object.keys(JSON.parse(stored ?? "{}")).sort()).toEqual([
    "finished",
    "prefs",
    "resume",
    "v",
  ]);
  expect(stored).not.toMatch(/par|Solved/i);
});
