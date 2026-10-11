import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";

const output = (page: Page) =>
  page.getByRole("log", { name: "Terminal output" });

test("the playground stashes an edit and brings it back", async ({ page }) => {
  await page.goto("/playground?world=recipe-site");
  await typeCommands(page, [
    "git init",
    "git add .",
    'git commit -m "First snapshot"',
    'echo "Soup tonight." >> README.md',
    "git stash",
  ]);
  await expect(output(page)).toContainText(
    "Saved working directory and index state WIP on main",
  );
  await typeCommands(page, ["git status --short", "git stash list"]);
  await expect(output(page)).toContainText("stash@{0}: WIP on main");

  await typeCommands(page, ["git stash pop"]);
  await expect(output(page)).toContainText("Dropped refs/stash@{0}");
  await expect(output(page)).toContainText("modified:   README.md");
});
