import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";

test("an entry switches forms and -h opens it from a sandbox", async ({
  page,
}) => {
  await page.goto("/reference");
  await page.getByRole("link", { name: "git init" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("git init");
  await page.getByRole("radio", { name: "git init -b trunk" }).check();
  await expect(
    page.getByRole("region", { name: "What Git prints" }),
  ).toContainText("git init -b trunk");

  await page.goto("/playground");
  await typeCommands(page, ["git commit -h"]);
  const sheet = page.getByRole("dialog", { name: "git commit" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();

  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await page.getByRole("link", { name: "git init" }).click();
  await page.getByRole("button", { name: "Load my sandbox state" }).click();
  await expect(page.getByText("Starting state: your sandbox")).toBeVisible();
});
