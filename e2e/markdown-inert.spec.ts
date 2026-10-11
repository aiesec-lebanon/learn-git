import { expect, test } from "./fixtures";

const INJECTIONS = [
  "<img src=x onerror=alert(1)>",
  "<script>alert(2)</script>",
  "[click me](javascript:alert(3))",
  '<a href="javascript:alert(4)">raw link</a>',
  "![tracker](https://tracker.example/pixel.png)",
].join("\n\n");

test("Markdown in pull requests and comments renders injection strings inert", async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.goto("/playground?world=team-repo");
  const hub = page.getByRole("region", {
    name: "The Hub, a simulated hosting site",
  });
  await hub
    .getByRole("navigation", { name: "Repository" })
    .getByRole("button", { name: "Pull requests" })
    .click();
  await hub.getByRole("button", { name: "New pull request" }).click();
  await hub.getByLabel("Description").fill(INJECTIONS);
  await hub.getByRole("button", { name: "Create pull request" }).click();
  await hub.getByLabel("Add a comment").fill(INJECTIONS);
  await hub.getByRole("button", { name: "Comment", exact: true }).click();

  await expect(hub.getByText("<img src=x onerror=alert(1)>")).toHaveCount(2);
  await expect(hub.getByText("<script>alert(2)</script>")).toHaveCount(2);
  await expect(hub.getByText("tracker", { exact: true })).toHaveCount(2);
  await expect(hub.locator("img, script, iframe, object")).toHaveCount(0);
  await expect(hub.locator('a[href^="javascript"]')).toHaveCount(0);
  await expect(hub.locator("[onerror]")).toHaveCount(0);
  expect(dialogs).toEqual([]);
});
