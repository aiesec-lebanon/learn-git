import type { Page } from "@playwright/test";
import { expectDone } from "./b1-1";
import { test } from "./fixtures";

/** The Your turn chips of a lesson: pick a chip, tick options, Run. */
function chipsOf(page: Page) {
  const turn = page.getByRole("region", { name: "Your turn" });
  return {
    turn,
    chip: (name: RegExp) =>
      turn
        .getByRole("list", { name: "Commands" })
        .getByRole("button", { name })
        .click(),
    tick: (text: RegExp) =>
      turn.locator("label").filter({ hasText: text }).click(),
    run: () => turn.getByRole("button", { name: "Run" }).click(),
  };
}

test("B2.2 can be finished with command chips alone @phone", async ({
  page,
}) => {
  await page.goto("/learn/b2-2");
  const { chip, tick, run } = chipsOf(page);
  await chip(/^git restore/);
  await tick(/^style\.css$/);
  await run();
  await chip(/^git restore/);
  await tick(/^--staged/);
  await tick(/^debug\.log$/);
  await run();
  await expectDone(page);
});

test("B4.1 can be finished with command chips alone @phone", async ({
  page,
}) => {
  await page.goto("/learn/b4-1");
  const { turn, chip, tick, run } = chipsOf(page);
  await chip(/^git merge/);
  await turn.getByRole("textbox", { name: /^branch/ }).fill("dark-mode");
  await run();
  await chip(/^git branch/);
  await tick(/^-d/);
  await turn.getByRole("textbox", { name: /^branch name/ }).fill("dark-mode");
  await run();
  await expectDone(page);
});
