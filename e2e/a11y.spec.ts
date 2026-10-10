import { expect, expectAxeClean, test } from "./fixtures";
import { expectDone, LESSON, typeCommands, YOUR_TURN } from "./b1-1";

for (const path of ["/", LESSON, "/settings"])
  test(`axe passes on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAxeClean(page);
  });

test("the graph reads as a list after the first commit", async ({ page }) => {
  await page.goto(LESSON);
  await typeCommands(page, YOUR_TURN);
  await expectDone(page);
  const yourTurn = page.getByRole("region", { name: "Your turn" });
  await expect(
    yourTurn.getByRole("list", { name: "Repository: commits, oldest first" }),
  ).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - button /^[0-9a-f]{7}, First snapshot, first commit, main, HEAD$/
  `);
  await expectAxeClean(page);
});
