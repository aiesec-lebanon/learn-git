import { expect, test } from "./fixtures";
import { typeCommands } from "./b1-1";

test("sound is off by default and plays a cue once turned on", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Real = window.AudioContext;
    const w = window as unknown as { contexts: number };
    w.contexts = 0;
    window.AudioContext = class extends Real {
      constructor(options?: AudioContextOptions) {
        super(options);
        w.contexts += 1;
      }
    };
  });
  const contexts = () =>
    page.evaluate(() => (window as unknown as { contexts: number }).contexts);

  await page.goto("/learn/b1-2");
  await typeCommands(page, ["git add README.md", 'git commit -m "Fix typo"']);
  await expect(
    page.getByText("Your repository now matches the target."),
  ).toBeVisible();
  expect(await contexts()).toBe(0);

  await page.goto("/settings");
  await page.getByRole("checkbox", { name: /^Play short sounds/ }).check();
  await page.goto("/learn/b1-2");
  await typeCommands(page, ['git commit -m "Nothing staged"']);
  await page.getByRole("button", { name: "Show differences" }).waitFor();
  expect(await contexts()).toBe(0);
  await typeCommands(page, [
    "git add app.js",
    'git commit -m "Add the feature"',
  ]);
  await expect.poll(contexts).toBe(1);
});
