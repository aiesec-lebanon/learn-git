import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";
import { act, expectDebrief } from "./scenario";
import scene from "../content/scenarios/s-b2";

const [carry] = scene.experts;
const stash = scene.experts[1] ?? carry;

test("S-B2: carry the edits to a new branch, then pick up again after a reload", async ({
  page,
}) => {
  await page.goto("/scenarios/s-b2");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "S-B2 Wrong branch, uncommitted work",
    }),
  ).toBeVisible();
  await expect(page.getByText("Message from Sam")).toBeVisible();

  await typeCommands(page, carry.solution.slice(0, 1));
  await expect(act(page, 1)).toContainText("done");
  await expect(act(page, 2)).toHaveAttribute("aria-current", "step");
  await typeCommands(page, carry.solution.slice(1));
  await expectDebrief(page);
  await expect(
    page.getByText("Carry the edits along (4 commands)"),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Pick up after act 3 of 3" }).click();
  await expectDebrief(page);

  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Continue where you left off" }),
  ).toContainText("S-B2 Wrong branch, uncommitted work");
});

test("S-B2: the stash route is accepted too", async ({ page }) => {
  await page.goto("/scenarios/s-b2");
  await typeCommands(page, stash.solution);
  await expectDebrief(page);
  await expect(page.getByText("Your path (6 commands)")).toBeVisible();
});
