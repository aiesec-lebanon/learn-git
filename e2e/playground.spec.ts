import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { terminal, typeCommands } from "./b1-1";

const output = (page: Page) =>
  page.getByRole("log", { name: "Terminal output" });

test("the playground runs commands, edits files and resets", async ({
  page,
}) => {
  await page.goto("/playground?world=recipe-site");
  await expect(
    page.getByRole("link", { name: "Recipe site", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await typeCommands(page, ["git init", "git add .", "git commit"]);
  const sheet = page.getByRole("dialog", { name: "Commit message" });
  await sheet.getByRole("textbox", { name: "Message" }).fill("First snapshot");
  await sheet.getByRole("button", { name: "Save and close" }).click();
  await expect(output(page)).toContainText("First snapshot");

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("Nothing to rewind yet.")).toBeVisible();
  await expect(terminal(page)).toBeVisible();
});

test("a lesson prompt shows its target; unknown queries fall back", async ({
  page,
}) => {
  await page.goto("/playground?prompt=b1-1");
  await expect(
    page.getByRole("heading", { name: /^Prompt: B1\.1/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show differences" }),
  ).toBeVisible();

  await page.goto("/playground?world=%3Cscript%3E&prompt=__proto__");
  await expect(
    page.getByRole("link", { name: "Empty folder", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("<script>")).toHaveCount(0);
});
