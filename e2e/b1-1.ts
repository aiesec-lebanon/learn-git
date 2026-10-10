import type { Page } from "@playwright/test";
import { abbreviate, createWorld, resolveHead, Session } from "../engine";
import scene from "../content/lessons/b1-1/scene";
import { expect } from "./fixtures";

export const LESSON = "/learn/b1-1";

/** The Your turn commands a newcomer types. */
export const YOUR_TURN = scene.yourTurn.solution;

/** The ID the engine gives the first commit for the same steps (cross-engine determinism). */
export function expectedCommitId(): string {
  const session = new Session(createWorld(scene.yourTurn.world));
  for (const line of YOUR_TURN) session.run(line);
  const { world } = session.getSnapshot();
  const repo = [...world.repos.values()][0];
  const head = repo && resolveHead(repo);
  if (!head) throw new Error("no commit");
  return abbreviate(world.objects, head);
}

export const terminal = (page: Page) =>
  page.getByRole("textbox", { name: /^Command in/ });

export async function typeCommands(page: Page, lines: readonly string[]) {
  const input = terminal(page);
  for (const line of lines) {
    await input.fill(line);
    await input.press("Enter");
  }
}

export const confirmation = (page: Page) =>
  page.getByText("Your repository now matches the target.", { exact: true });

export async function expectDone(page: Page) {
  await expect(confirmation(page).first()).toBeVisible();
}
