import { expect, test } from "./fixtures";
import { expectDone, LESSON, typeCommands, YOUR_TURN } from "./b1-1";

test("B1.1 works when storage is blocked, without a resume card", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    }),
  );
  await page.goto(LESSON);
  await typeCommands(page, YOUR_TURN);
  await expectDone(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn Git");
  await expect(
    page.getByRole("heading", { name: "Continue where you left off" }),
  ).toHaveCount(0);
});

test("B1.1 works with a corrupt stored document", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("learn-git", "{oops"));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Continue where you left off" }),
  ).toHaveCount(0);
  await page.goto(LESSON);
  await typeCommands(page, YOUR_TURN);
  await expectDone(page);
});
