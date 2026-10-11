import { test } from "./fixtures";
import { expectDone } from "./b1-1";

test("B5.2 can be finished with command chips alone @phone", async ({
  page,
}) => {
  await page.goto("/learn/b5-2");
  const turn = page.getByRole("region", { name: "Your turn" });
  const chips = turn.getByRole("list", { name: "Commands" });
  const run = turn.getByRole("button", { name: "Run" });

  await chips.getByRole("button", { name: /^git fetch/ }).click();
  await run.click();
  await chips.getByRole("button", { name: /^git merge/ }).click();
  await turn.getByRole("textbox", { name: /^branch/ }).fill("origin/main");
  await run.click();
  await expectDone(page);
});
