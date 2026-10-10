import { expect, test } from "./fixtures";
import { LESSON } from "./b1-1";

test.use({ javaScriptEnabled: false });

test("B1.1 prose and the first stage frame read without JavaScript", async ({
  page,
}) => {
  await page.goto(LESSON);
  await expect(page.getByText(/Which one is the page that/)).toBeVisible();
  for (const title of [
    "A folder full of copies",
    "A snapshot of the whole project",
    "git init creates the repository",
    "Tell Git who you are",
    "The first commit",
  ])
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const stage = page.getByRole("region", { name: "Lesson stage" });
  await expect(stage.getByText("No repository here yet.")).toBeVisible();
  await expect(stage.getByText("README.md")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeVisible();
});
