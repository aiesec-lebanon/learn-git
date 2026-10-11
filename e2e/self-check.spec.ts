import { expect, test } from "./fixtures";

test("the self-check suggests a chapter and stores only where to resume", async ({
  page,
}) => {
  await page.goto("/start");
  const suggestion = page.getByRole("region", { name: /^Suggested:/ });
  await expect(suggestion).toHaveAccessibleName(
    "Suggested: B1 Snapshots: what Git keeps",
  );
  await page.getByRole("checkbox", { name: /^I can turn a folder/ }).check();
  await page.getByRole("checkbox", { name: /^I can see exactly/ }).check();
  await expect(suggestion).toHaveAccessibleName("Suggested: B3 Branches");
  await expect(suggestion).toContainText(
    "You didn't tick: I can create and switch branches",
  );
  await expect(
    suggestion.getByRole("link", { name: "Prove it instead" }),
  ).toHaveAttribute("href", "/capstones/b3");

  await suggestion.getByRole("link", { name: "Start there" }).click();
  await expect(page).toHaveURL(/\/learn\/b3-1$/);
  const stored = JSON.parse(
    (await page.evaluate(() => localStorage.getItem("learn-git"))) ?? "{}",
  );
  expect(stored.resume).toEqual({ kind: "lesson", id: "b3-1", step: 0 });
  expect(JSON.stringify(stored)).not.toMatch(/tick|I can/);
});

test("past Beginner, the self-check points to the playground and reference", async ({
  page,
}) => {
  await page.goto("/start");
  const beginner = page.getByRole("group", { name: "Beginner" });
  for (const box of await beginner.getByRole("checkbox").all())
    await box.check();
  const next = page.getByRole("region", {
    name: "Next: the Intermediate and Pro tracks",
  });
  await expect(next).toContainText("You didn't tick: I can amend");
  await expect(next.getByRole("link", { name: "playground" })).toBeVisible();
});
