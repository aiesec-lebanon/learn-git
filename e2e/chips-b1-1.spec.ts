import { test } from "./fixtures";
import { expectDone, LESSON } from "./b1-1";

test("B1.1 can be finished with command chips alone @phone", async ({
  page,
}) => {
  await page.goto(LESSON);
  const turn = page.getByRole("region", { name: "Your turn" });
  const chips = turn.getByRole("list", { name: "Commands" });
  const run = turn.getByRole("button", { name: "Run" });
  // Chip inputs are visually hidden; learners tap their labels.
  const tap = (text: string) =>
    turn.locator("label", { hasText: text }).first().click();

  for (const [setting, value] of [
    ["user.name", "Sam Lee"],
    ["user.email", "sam@example.com"],
  ] as const) {
    await chips.getByRole("button", { name: /^git config/ }).click();
    await tap("--global");
    await tap(setting);
    await turn.getByRole("textbox", { name: /^value/ }).fill(value);
    await run.click();
  }
  await chips.getByRole("button", { name: /^git init/ }).click();
  await chips.getByRole("button", { name: /^git add/ }).click();
  await tap("--all");
  await run.click();
  await chips.getByRole("button", { name: /^git commit/ }).click();
  await turn.getByRole("textbox", { name: "message" }).fill("First snapshot");
  await run.click();
  await expectDone(page);
});
