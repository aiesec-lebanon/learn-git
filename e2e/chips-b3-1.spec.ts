import { test } from "./fixtures";
import { expectDone } from "./b1-1";

test("B3.1 can be finished with command chips alone @phone", async ({
  page,
}) => {
  await page.goto("/learn/b3-1");
  const turn = page.getByRole("region", { name: "Your turn" });
  const chips = turn.getByRole("list", { name: "Commands" });
  const run = turn.getByRole("button", { name: "Run" });
  const tap = (text: string) =>
    turn.locator("label", { hasText: text }).first().click();

  await chips.getByRole("button", { name: /^git switch/ }).click();
  await tap("make the branch first");
  await turn.getByRole("textbox", { name: /^branch/ }).fill("dark-mode");
  await run.click();

  await chips.getByRole("button", { name: /^edit/ }).click();
  await turn.getByRole("textbox", { name: /^file name/ }).fill("dark.css");
  await run.click();
  const sheet = page.getByRole("dialog", { name: "Edit dark.css" });
  await sheet
    .getByRole("textbox", { name: "Content of dark.css" })
    .fill("body { background: #222; }");
  await sheet.getByRole("button", { name: "Save and close" }).click();

  await chips.getByRole("button", { name: /^git add/ }).click();
  await tap("--all");
  await run.click();
  await chips.getByRole("button", { name: /^git commit/ }).click();
  await turn
    .getByRole("textbox", { name: "message" })
    .fill("Add a dark stylesheet");
  await run.click();

  await chips.getByRole("button", { name: /^git switch/ }).click();
  await turn.getByRole("textbox", { name: /^branch/ }).fill("main");
  await run.click();
  await expectDone(page);
});
