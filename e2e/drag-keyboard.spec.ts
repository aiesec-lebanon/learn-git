import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { tabTo } from "./keys";

/** Presses an arrow until the drag preview reads `text`. */
async function aimAt(page: Page, text: string, limit = 12) {
  const preview = page.getByText(text, { exact: true });
  for (let i = 0; i < limit; i++) {
    if (await preview.isVisible()) return;
    await page.keyboard.press("ArrowRight");
  }
  await expect(preview).toBeVisible();
}

test("B3.1: make a branch and move HEAD onto it without dragging", async ({
  page,
}) => {
  await page.goto("/learn/b3-1#step-1");
  const name = page.getByRole("textbox", { name: "New label name" });
  await tabTo(page, name, 200);
  await page.keyboard.type("dark-mode");
  await tabTo(page, page.getByRole("button", { name: "+ new label" }));
  await page.keyboard.press("Space");
  await expect(
    page.getByText(/^Will run: git branch dark-mode [0-9a-f]{7}$/),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/^Ran: git branch dark-mode [0-9a-f]{7}$/),
  ).toBeVisible();

  await tabTo(page, page.getByRole("button", { name: "HEAD", exact: true }));
  await page.keyboard.press("Space");
  await aimAt(page, "Will run: git switch dark-mode");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ran: git switch dark-mode")).toBeVisible();
});

test("B4.1: predict where main lands by keyboard, then reveal", async ({
  page,
}) => {
  await page.goto("/learn/b4-1#step-1");
  const widget = page
    .getByRole("figure")
    .filter({ hasText: "Predict, then look." });
  await tabTo(
    page,
    widget.getByRole("button", { name: "dark-mode", exact: true }),
    200,
  );
  await page.keyboard.press("Enter");
  await expect(
    widget.getByText("Where will main be after git merge dark-mode?"),
  ).toBeVisible();

  const graph = widget.getByRole("list", { name: /^Your turn repository/ });
  await tabTo(page, graph.getByRole("button", { name: /, HEAD$/ }));
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(
    widget.getByText(/^Your guess: main lands on [0-9a-f]{7}/),
  ).toBeVisible();

  await tabTo(page, widget.getByRole("button", { name: "Show what Git does" }));
  await page.keyboard.press("Enter");
  await expect(
    widget.getByText(
      /^You expected main on [0-9a-f]{7}, and so does Git\. main lands on/,
    ),
  ).toBeVisible();
  await expect(
    widget.getByText(/Fast-forward: main has nothing new/),
  ).toBeVisible();
});
