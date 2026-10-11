import { expect, test } from "./fixtures";

test("an issue is filed, linked from a pull request and closed by its merge", async ({
  page,
}) => {
  await page.goto("/playground?world=team-repo");
  const hub = page.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  const address = hub.getByText(/^hub\.test/);
  const repoNav = hub.getByRole("navigation", { name: "Repository" });

  await repoNav.getByRole("button", { name: "Issues" }).click();
  await hub.getByRole("button", { name: "New issue" }).click();
  await hub.getByLabel("Title").fill("Volunteers are missing");
  await hub.getByLabel("bug").check();
  await hub.getByLabel("Assignee").selectOption("you");
  await hub.getByRole("button", { name: "Create issue" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/issues/1");
  await expect(hub.getByText("assigned to you")).toBeVisible();

  await repoNav.getByRole("button", { name: "Pull requests" }).click();
  await hub.getByRole("button", { name: "New pull request" }).click();
  await hub.getByLabel("Description").fill("Fixes #1");
  await hub.getByRole("button", { name: "Create pull request" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/pull/2");
  await hub.getByRole("button", { name: "Merge pull request" }).click();

  await repoNav.getByRole("button", { name: "Issues" }).click();
  await hub.getByRole("button", { name: "Volunteers are missing" }).click();
  await expect(hub.getByText("closed this with pull request #2")).toBeVisible();
  await expect(hub.getByText("it closed this issue.")).toBeVisible();
  await hub.getByRole("button", { name: "Reopen issue" }).click();
  await expect(hub.getByText(/reopened this/)).toBeVisible();
});
