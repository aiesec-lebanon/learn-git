import { expect, test } from "./fixtures";

test("a pull request is opened from a compare and takes a comment", async ({
  page,
}) => {
  await page.goto("/playground?world=team-repo");
  const hub = page.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  const address = hub.getByText(/^hub\.test/);
  await hub
    .getByRole("navigation", { name: "Repository" })
    .getByRole("button", { name: "Pull requests" })
    .click();
  await hub.getByRole("button", { name: "New pull request" }).click();
  await expect(hub.getByLabel("Base")).toHaveValue("main");
  await expect(hub.getByLabel("Compare")).toHaveValue("docs");
  await expect(hub.getByText("Able to merge")).toBeVisible();
  await expect(hub.getByLabel("Title")).toHaveValue("List the volunteers");
  await hub.getByLabel("Description").fill("Adds **the volunteers**.");
  await hub.getByRole("button", { name: "Create pull request" }).click();

  await expect(address).toHaveText("hub.test/sam/bake-sale/pull/1");
  await expect(hub.getByRole("heading", { level: 2 })).toContainText(
    "List the volunteers #1",
  );
  await expect(
    hub.locator("strong", { hasText: "the volunteers" }),
  ).toBeVisible();
  await hub.getByLabel("Add a comment").fill("Ready for review");
  await hub.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(hub.getByText("Ready for review")).toBeVisible();
  await hub.getByRole("button", { name: /^Files changed/ }).click();
  await expect(address).toHaveText("hub.test/sam/bake-sale/pull/1/files");
  await expect(hub.getByText("docs/volunteers.md")).toBeVisible();
});
