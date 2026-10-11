import { expect, test } from "./fixtures";

test("a pull request is reviewed on a line, merged, and its branch deleted and restored", async ({
  page,
}) => {
  await page.goto("/playground?world=team-repo");
  const hub = page.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  await hub
    .getByRole("navigation", { name: "Repository" })
    .getByRole("button", { name: "Branches" })
    .click();
  await hub.getByRole("button", { name: "New pull request from docs" }).click();
  await hub.getByRole("button", { name: "Create pull request" }).click();

  await hub.getByRole("button", { name: /^Files changed/ }).click();
  await hub
    .getByRole("button", { name: "Comment on line 1 of docs/volunteers.md" })
    .click();
  await page.keyboard.type("Add Ana's phone number?");
  await hub.getByRole("button", { name: "Add to review" }).click();
  await expect(
    hub.getByText("1 line comment waiting in this review."),
  ).toBeVisible();
  await hub.getByRole("button", { name: "Submit review" }).click();
  await expect(hub.getByText("Add Ana's phone number?")).toBeVisible();

  await hub.getByRole("button", { name: "Conversation" }).click();
  await expect(hub.getByText(/reviewed at/)).toBeVisible();
  await expect(
    hub.getByRole("heading", { name: "Ready to merge" }),
  ).toBeVisible();
  await hub.getByRole("button", { name: "Merge pull request" }).click();
  await expect(
    hub.getByRole("heading", { name: "Pull request merged" }),
  ).toBeVisible();
  await hub.getByRole("button", { name: "Delete branch" }).click();
  await expect(hub.getByText(/deleted the docs branch/)).toBeVisible();
  await hub.getByRole("button", { name: "Restore branch" }).click();
  await expect(hub.getByText(/restored the docs branch/)).toBeVisible();
});
