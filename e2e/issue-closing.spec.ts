import { writeFile } from "../content/define";
import { INDEX_FOOTER_FIXED } from "../content/worlds/team-repo";
import { expectDone, typeCommands } from "./b1-1";
import { expect, test } from "./fixtures";

test("B6.3: an issue is filed and closed by merging a pull request that says Fixes #3", async ({
  page,
}) => {
  await page.goto("/learn/b6-3");
  const turn = page.getByRole("region", { name: "Your turn" });
  const hub = turn.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  const address = hub.getByText(/^hub\.test/);
  const repoNav = hub.getByRole("navigation", { name: "Repository" });

  await repoNav.getByRole("button", { name: "Issues" }).click();
  await hub.getByRole("button", { name: "New issue" }).click();
  await hub.getByLabel("Title").fill("The footer's menu link is broken");
  await hub.getByRole("button", { name: "Create issue" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/issues/3");

  await typeCommands(page, [
    "git switch -c fix-footer",
    writeFile("index.html", INDEX_FOOTER_FIXED),
    'git commit -am "Fix the footer link"',
    "git push -u origin fix-footer",
  ]);
  await repoNav.getByRole("button", { name: "Pull requests" }).click();
  await hub.getByRole("button", { name: "New pull request" }).click();
  await hub.getByLabel("Compare", { exact: true }).selectOption("fix-footer");
  await hub.getByLabel("Description").fill("Fixes #3");
  await hub.getByRole("button", { name: "Create pull request" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/pull/4");
  const pending = page.getByText("Merging #4 into main will close #3.", {
    exact: true,
  });
  await expect(pending).toBeAttached();

  await hub.getByRole("button", { name: "Merge pull request" }).click();
  await expectDone(page);
  const closed = page.getByText("#4 merged into main and closed #3.", {
    exact: true,
  });
  await expect(closed).toBeAttached();
  await repoNav.getByRole("button", { name: "Issues" }).click();
  await hub
    .getByRole("button", { name: "The footer's menu link is broken" })
    .click();
  await expect(hub.getByText("closed this with pull request #4")).toBeVisible();
});
