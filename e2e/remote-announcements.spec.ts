import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";

test("a teammate's push and the fetch that sees it are announced", async ({
  page,
}) => {
  await page.goto("/playground?world=team-repo");
  const live = page.locator('[role="status"][aria-live="polite"]');

  await typeCommands(page, ["git status", "git log --oneline"]);
  await expect(live).toHaveText(
    "Nothing changed. Sam pushed 1 commit to main on origin: Add the team meeting.",
  );
  await typeCommands(page, ["git fetch"]);
  await expect(live).toContainText("origin/main");
});
