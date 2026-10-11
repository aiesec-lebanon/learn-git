import { writeFile } from "../content/define";
import { DARK_HEADINGS } from "../content/worlds/team-repo";
import { expectDone, typeCommands } from "./b1-1";
import { expect, expectAxeClean, test } from "./fixtures";

test("B6.2: a pull request is reviewed, fixed, merged on origin only, then pulled and cleaned up", async ({
  page,
}) => {
  await page.goto("/learn/b6-2");
  const turn = page.getByRole("region", { name: "Your turn" });
  const hub = turn.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  const address = hub.getByText(/^hub\.test/);

  await typeCommands(page, ["git push -u origin dark-mode"]);
  await hub
    .getByRole("navigation", { name: "Repository" })
    .getByRole("button", { name: "Pull requests" })
    .click();
  await hub.getByRole("button", { name: "New pull request" }).click();
  await hub.getByLabel("Compare", { exact: true }).selectOption("dark-mode");
  await hub.getByRole("button", { name: "Create pull request" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/pull/1");
  await expect(
    hub.getByText("Changes were requested by sam.", { exact: true }),
  ).toBeVisible();
  await expectAxeClean(page);

  await typeCommands(page, [
    writeFile("style.css", DARK_HEADINGS),
    'git commit -am "Colour the headings"',
    "git push",
  ]);
  await expect(
    hub.getByRole("heading", { name: "Ready to merge" }),
  ).toBeVisible();
  await hub.getByRole("button", { name: "Merge pull request" }).click();
  await expect(
    hub.getByRole("heading", { name: "Pull request merged" }),
  ).toBeVisible();
  await expect(turn.getByText("Only on origin so far:")).toBeVisible();
  const originOnly = page.getByText(
    /^The merge commit [0-9a-f]{7} is on origin only\./,
  );
  await expect(originOnly).toBeAttached();

  await hub.getByRole("button", { name: "Delete branch" }).click();
  await typeCommands(page, [
    "git switch main",
    "git pull",
    "git branch -d dark-mode",
  ]);
  await expectDone(page);
  await expect(turn.getByText("Only on origin so far:")).toHaveCount(0);
});
