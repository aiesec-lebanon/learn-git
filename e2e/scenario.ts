import type { Page } from "@playwright/test";
import { expect } from "./fixtures";

export const output = (page: Page) =>
  page.getByRole("log", { name: "Terminal output" });

export const act = (page: Page, n: number) =>
  page
    .getByRole("list", { name: "Acts" })
    .getByRole("listitem")
    .filter({ hasText: `Act ${n}` });

export async function expectDebrief(page: Page) {
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
}
