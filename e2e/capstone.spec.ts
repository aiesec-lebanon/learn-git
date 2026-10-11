import { expect, test } from "./fixtures";
import { expectDone, typeCommands } from "./b1-1";
import capstone from "../content/capstones/b2";

test("a capstone finishes its chapter", async ({ page }) => {
  await page.goto("/capstones/b2");
  await typeCommands(page, capstone.solution);
  await expectDone(page);

  await page.goto("/tracks/beginner");
  const chapter = (name: string) =>
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { level: 2, name }) });
  await expect(
    chapter("B2 Seeing and undoing changes").getByText("Finished"),
  ).toBeVisible();
  await expect(
    chapter("B1 Snapshots: what Git keeps").getByText("Finished"),
  ).toHaveCount(0);
});
