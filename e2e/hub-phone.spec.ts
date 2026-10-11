import { expectDone } from "./b1-1";
import { expect, test } from "./fixtures";

test("B6.1 on a phone: the Hub and the repositories take turns on the screen @phone", async ({
  page,
}) => {
  await page.goto("/learn/b6-1");
  const turn = page.getByRole("region", { name: "Your turn" });
  const screen = turn.getByRole("group", { name: "Show on this screen" });
  const hub = turn.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });

  await expect(hub).toBeHidden();
  await screen.getByRole("button", { name: "The Hub" }).click();
  await expect(hub).toBeVisible();
  await hub.getByRole("button", { name: "New repository" }).click();
  await hub.getByLabel("Repository name").fill("recipes");
  await hub.getByRole("button", { name: "Create repository" }).click();
  await expect(hub.getByText(/^hub\.test/)).toHaveText("hub.test/you/recipes");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await screen.getByRole("button", { name: "Your repositories" }).click();
  await expect(hub).toBeHidden();
  const chips = turn.getByRole("list", { name: "Commands" });
  const run = turn.getByRole("button", { name: "Run" });
  await chips.getByRole("button", { name: /^git remote/ }).click();
  await turn.locator("label").filter({ hasText: /^add$/ }).click();
  await turn.getByRole("textbox", { name: /^name/ }).fill("origin");
  await turn
    .getByRole("textbox", { name: /^address/ })
    .fill("https://hub.test/you/recipes.git");
  await run.click();
  await chips.getByRole("button", { name: /^git push/ }).click();
  await turn.locator("label").filter({ hasText: /^-u/ }).click();
  await turn.getByRole("textbox", { name: /^remote/ }).fill("origin");
  await turn.getByRole("textbox", { name: /^branch/ }).fill("main");
  await run.click();
  await expectDone(page);
});
