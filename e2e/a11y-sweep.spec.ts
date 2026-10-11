import type { Locator, Page } from "@playwright/test";
import { CAPSTONES } from "../content/capstones";
import type { Step } from "../content/define";
import { expectDone, terminal, typeCommands } from "./b1-1";
import { expect, expectAxeClean, test } from "./fixtures";
import { tabTo } from "./keys";

const PAGES = [
  "/",
  "/start",
  "/orientation",
  "/tracks/beginner",
  "/learn/b3-2",
  "/capstones/b1",
  "/scenarios/s-b2",
  "/playground",
  "/reference",
  "/reference/commit",
  "/challenges",
  "/settings",
  "/field-guide",
  "/no-such-page",
];

const settled = (page: Page) =>
  expect(page.getByRole("heading", { level: 1 })).toBeVisible();

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });
    for (const path of PAGES) {
      test(`axe passes on ${path}`, async ({ page }) => {
        await page.goto(path);
        await settled(page);
        await expectAxeClean(page);
      });
    }
  });
}

test("pages reflow at 320 px without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of PAGES) {
    await page.goto(path);
    await settled(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("the skip link is the first stop and lands on the content", async ({
  page,
}) => {
  await page.goto("/learn/b1-1");
  await settled(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test.describe("stage states", () => {
  test("after a command, with hints shown", async ({ page }) => {
    await page.goto("/capstones/b1");
    await typeCommands(page, ["git status"]);
    const ask = page.getByRole("button", {
      name: /Show a(nother)? hint/,
    });
    await expect(ask).toBeVisible();
    while (await ask.isVisible()) await ask.click();
    await expect(page.getByRole("link", { name: /^Reference:/ })).toBeVisible();
    await expectAxeClean(page);
  });

  test("editor sheet and reference sheet open", async ({ page }) => {
    await page.goto("/playground");
    await settled(page);
    await typeCommands(page, [
      "git init",
      "echo hi > a.txt",
      "git add a.txt",
      "git commit",
    ]);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectAxeClean(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await typeCommands(page, ["git commit -h"]);
    await expect(
      page.getByRole("dialog", { name: "git commit" }),
    ).toBeVisible();
    await expectAxeClean(page);
  });

  test("conflict resolver open", async ({ page }) => {
    await page.goto("/capstones/b4");
    await typeCommands(page, [
      "git merge bags",
      "git merge hours",
      "git merge pricing",
    ]);
    await expect(
      page.getByRole("region", { name: "Resolve the merge" }),
    ).toBeVisible();
    await expectAxeClean(page);
  });

  test("Hub open, remote branches labelled in words", async ({ page }) => {
    await page.goto("/capstones/b6");
    const hub = page.getByRole("region", {
      name: "The Hub, a simulated hosting site",
    });
    await expect(hub).toBeVisible({ timeout: 15_000 });
    await expectAxeClean(page);
    await typeCommands(page, ["git fetch"]);
    await expect(
      page.getByRole("button", { name: /origin\/main/ }).first(),
    ).toBeVisible();
  });
});

/** Takes a step by keyboard alone: lines in the terminal, Hub actions through the Hub's controls. */
async function keyboardStep(page: Page, hub: Locator, step: Step) {
  const press = async (target: Locator, key = "Enter") => {
    await tabTo(page, target, 200);
    await page.keyboard.press(key);
  };
  const typeInto = async (target: Locator, text: string) => {
    await tabTo(page, target, 200);
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(text);
  };
  const choose = async (target: Locator, value: string) => {
    await tabTo(page, target, 200);
    for (let i = 0; i < 10 && (await target.inputValue()) !== value; i++)
      await page.keyboard.press("ArrowDown");
    await expect(target).toHaveValue(value);
  };
  const nav = (name: string) =>
    hub
      .getByRole("navigation", { name: "Repository" })
      .getByRole("button", { name });

  if (typeof step === "string") {
    await tabTo(page, terminal(page), 200);
    await page.keyboard.type(step);
    await page.keyboard.press("Enter");
    return;
  }
  switch (step.type) {
    case "open-issue":
      await press(nav("Issues"));
      await press(hub.getByRole("button", { name: "New issue" }));
      await typeInto(hub.getByLabel("Title"), step.title);
      for (const label of step.labels ?? [])
        await press(hub.getByLabel(label), "Space");
      await press(hub.getByRole("button", { name: "Create issue" }));
      return;
    case "open-pull-request":
      await press(nav("Pull requests"));
      await press(hub.getByRole("button", { name: "New pull request" }));
      await choose(hub.getByLabel("Compare", { exact: true }), step.head);
      await typeInto(hub.getByLabel("Title"), step.title);
      await typeInto(hub.getByLabel("Description"), step.body ?? "");
      await press(hub.getByRole("button", { name: "Create pull request" }));
      return;
    case "merge-pull-request":
      await press(hub.getByRole("button", { name: "Merge pull request" }));
      return;
    case "delete-branch":
      await press(hub.getByRole("button", { name: "Delete branch" }));
      return;
    default:
      throw new Error(`No keyboard path for ${step.type}`);
  }
}

for (const [chapter, capstone] of Object.entries(CAPSTONES)) {
  test(`capstone ${chapter} can be finished by keyboard alone`, async ({
    page,
  }) => {
    test.slow();
    await page.goto(`/capstones/${chapter}`);
    await settled(page);
    const hub = page.getByRole("region", {
      name: "The Hub, a simulated hosting site",
    });
    for (const step of capstone?.solution ?? [])
      await keyboardStep(page, hub, step);
    await expectDone(page);
  });
}

for (const path of ["/learn/b4-2", "/capstones/b6", "/playground"]) {
  test(`axe passes on ${path} on a phone @phone`, async ({ page }) => {
    await page.goto(path);
    await settled(page);
    await expect(page.getByRole("list", { name: "Commands" })).toBeVisible();
    await expectAxeClean(page);
    const hub = page.getByRole("button", { name: "The Hub", exact: true });
    if (await hub.isVisible()) {
      await hub.click();
      await expect(
        page.getByRole("region", { name: "The Hub, a simulated hosting site" }),
      ).toBeVisible();
      await expectAxeClean(page);
    }
  });
}
