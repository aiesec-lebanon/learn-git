import { expect, test } from "./fixtures";
import { expectDone, terminal } from "./b1-1";
import { tabTo } from "./keys";

test("B4.3: resolve a conflict by keyboard and finish the merge", async ({
  page,
}) => {
  await page.goto("/learn/b4-3");
  const input = terminal(page);
  await input.fill("git merge pricing");
  await input.press("Enter");

  const resolver = page.getByRole("region", { name: "Resolve the merge" });
  await expect(resolver.getByText(/^Merge paused/)).toBeVisible();
  await expect(
    resolver.getByRole("heading", { name: "Conflict 1 of 1 in menu.html" }),
  ).toBeVisible();
  await expect(
    resolver.getByRole("region", {
      name: "Ours: HEAD (the branch you are on)",
    }),
  ).toContainText("$3");
  await expect(
    resolver.getByRole("region", {
      name: "Theirs: pricing (the branch merged in)",
    }),
  ).toContainText("$5");

  await tabTo(
    page,
    resolver.getByRole("button", { name: "Edit", exact: true }),
    200,
  );
  await page.keyboard.press("Enter");
  const box = resolver.getByRole("textbox", {
    name: "The lines that replace this conflict",
  });
  await expect(box).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("  <li>Lemon cake: $4.50</li>\n");
  await tabTo(page, resolver.getByRole("button", { name: "Use these lines" }));
  await page.keyboard.press("Enter");
  await expect(
    resolver.getByText(/^All conflicts in menu\.html are decided/),
  ).toBeVisible();

  const mark = resolver.getByRole("button", { name: /^Mark resolved/ });
  await tabTo(page, mark);
  await page.keyboard.press("Enter");
  await expect(
    resolver.getByText(/Every file is marked resolved/),
  ).toBeVisible();

  await tabTo(page, resolver.getByRole("button", { name: /^Continue/ }));
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Commit message" });
  await expect(sheet.getByRole("textbox", { name: "Message" })).toHaveValue(
    /^Merge branch 'pricing'/,
  );
  await tabTo(page, sheet.getByRole("button", { name: "Save and close" }));
  await page.keyboard.press("Enter");
  await expect(resolver).toHaveCount(0);
  await expectDone(page);
});
