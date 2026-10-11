import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";

test("a lesson sandbox survives a visit to the reference", async ({ page }) => {
  await page.goto("/learn/b2-2");
  await typeCommands(page, ["git restore style.css"]);
  const output = page.getByRole("log", { name: "Terminal output" });
  await expect(output).toContainText("git restore style.css");

  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reference");
  await page.goBack();

  await expect(output).toContainText("git restore style.css");
  await expect(page.getByText("Step 1", { exact: true })).toBeVisible();
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
});
