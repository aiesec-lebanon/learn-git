import { expect, test } from "./fixtures";

test("the Hub browses a repository, goes back and creates one", async ({
  page,
}) => {
  await page.goto("/playground?world=team-repo");
  const hub = page.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  const address = hub.getByText(/^hub\.test/);
  await expect(address).toHaveText("hub.test/sam/bake-sale");

  const repoNav = hub.getByRole("navigation", { name: "Repository" });
  await repoNav.getByRole("button", { name: "Branches" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/branches");
  await expect(hub.getByRole("button", { name: "docs" })).toBeVisible();
  await hub.getByRole("button", { name: "Back" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale");
  await hub.getByRole("button", { name: "Forward" }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/branches");

  await hub.getByRole("button", { name: "Hub", exact: true }).click();
  await hub.getByRole("button", { name: "New repository" }).click();
  await hub.getByLabel("Repository name").fill("recipes");
  await hub.getByLabel("Add a README").check();
  await hub.getByRole("button", { name: "Create repository" }).click();
  await expect(address).toHaveText("hub.test/you/recipes");
  await expect(hub.getByRole("region", { name: "README.md" })).toContainText(
    "recipes",
  );
  await expect(
    page.locator('[role="status"][aria-live="polite"]'),
  ).toContainText("You created you/recipes on the Hub.");
});
