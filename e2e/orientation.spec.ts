import { expect, test } from "./fixtures";

test("Orientation previews the command a move stands for without running it", async ({
  page,
}) => {
  await page.goto("/orientation");
  await expect(
    page.getByRole("heading", { name: "Orientation", level: 1 }),
  ).toBeVisible();

  const head = page.getByRole("button", { name: "HEAD", exact: true });
  await head.click();
  await expect(head).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/^Will run: git switch --detach /)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Will run: git switch dark-mode")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Would run: git switch dark-mode")).toBeVisible();
  await expect(head).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("textbox", { name: "New label name" }).fill("fix");
  await page.getByRole("button", { name: "+ new label" }).click();
  const graph = page.getByRole("list", { name: /^Your turn repository/ });
  await graph.getByRole("button").first().click();
  await expect(
    page.getByText(/^Would run: git branch fix [0-9a-f]{7}$/),
  ).toBeVisible();

  await page.getByRole("button", { name: "HEAD", exact: true }).click();
  await page.getByRole("button", { name: "HEAD", exact: true }).click();
  await expect(page.getByText(/^Would run: git branch fix/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Start B1.1" })).toBeVisible();
});
