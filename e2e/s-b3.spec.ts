import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";
import { act, expectDebrief, output } from "./scenario";

test("S-B3: rejected push, fetch, divergent pull, refused force push, conflict, push", async ({
  page,
}) => {
  await page.goto("/scenarios/s-b3");

  await typeCommands(page, ["git push"]);
  await expect(output(page)).toContainText("! [rejected]");
  await typeCommands(page, ["git fetch", "git status"]);
  await expect(output(page)).toContainText("have diverged");
  await expect(act(page, 1)).toContainText("done");

  await typeCommands(page, ["git pull"]);
  await expect(output(page)).toContainText(
    "Need to specify how to reconcile divergent branches.",
  );
  await typeCommands(page, ["git push --force"]);
  await expect(output(page)).toContainText("(protected branch)");
  await expect(
    page.getByText(/^The Hub protects that branch; its remote: line/),
  ).toBeVisible();

  await typeCommands(page, ["git pull --no-rebase"]);
  const resolver = page.getByRole("region", { name: "Resolve the merge" });
  await resolver.getByRole("button", { name: "Edit", exact: true }).click();
  await resolver
    .getByRole("textbox", { name: "The lines that replace this conflict" })
    .fill("  <li>Lemon cake: $4.50</li>\n");
  await resolver.getByRole("button", { name: "Use these lines" }).click();
  await resolver.getByRole("button", { name: /^Mark resolved/ }).click();
  await resolver.getByRole("button", { name: /^Continue/ }).click();
  await page
    .getByRole("dialog", { name: "Commit message" })
    .getByRole("button", { name: "Save and close" })
    .click();
  await expect(act(page, 2)).toContainText("done");

  await typeCommands(page, ["git push"]);
  await expectDebrief(page);
  await expect(
    page.getByText("Fetch, look, then merge (7 commands)"),
  ).toBeVisible();
});
