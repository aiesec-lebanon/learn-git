import { expect, test } from "./fixtures";

test("settings apply at once, persist, and reset", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
  const html = page.locator("html");

  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: /^Reduce motion/ }).check();
  await expect(html).toHaveAttribute("data-motion", "reduce");
  await page.getByRole("radio", { name: "Off" }).check();

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Off" })).toBeChecked();

  await page.getByRole("button", { name: "Reset progress" }).click();
  const dialog = page.getByRole("dialog", { name: "Reset progress?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Reset progress" }).click();
  await dialog.getByRole("button", { name: "Reset progress" }).click();
  await expect(html).not.toHaveAttribute("data-theme");
  await expect(html).not.toHaveAttribute("data-motion");
  await expect(
    page.getByRole("radio", { name: "Full: Nib explains every change" }),
  ).toBeChecked();
  expect(
    await page.evaluate(() => localStorage.getItem("learn-git")),
  ).toBeNull();
});
