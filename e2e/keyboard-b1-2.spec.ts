import { expect, test } from "./fixtures";
import { confirmation, terminal } from "./b1-1";
import { tabTo } from "./keys";

test("B1.2: stage a file by keyboard and commit only the typo fix", async ({
  page,
}) => {
  await page.goto("/learn/b1-2#step-2");
  await expect(
    page.getByRole("heading", { name: "git add copies into the draft" }),
  ).toBeFocused();
  const card = page.getByRole("button", { name: /^README\.md/ });
  await tabTo(page, card, 150);
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Will run: git add README.md")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ran: git add README.md")).toBeVisible();

  await tabTo(page, terminal(page), 150);
  await page.keyboard.type('git commit -m "Fix typo"');
  await page.keyboard.press("Enter");
  await expect(confirmation(page).first()).toBeVisible();
});
