import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import type { BranchRule, World } from "../types";
import { repoOf } from "../world/access";
import { createWorld } from "../world/create";
import { hostedRepoId } from "../world/network";
import { pushRefusal } from "./rules";
import { hostedBy } from "./state";

const URL = "https://hub.test/sam/shop.git";
const SHOP = hostedRepoId("sam/shop");

const world = (rules: readonly BranchRule[]): World =>
  createWorld({
    hub: { "sam/shop": { rules }, "ada/notes": {} },
    setup: [
      `git clone -q ${URL}`,
      'cd shop && echo a > a.txt && git add a.txt && git commit -q -m "One"',
    ],
  });

const push = (start: World, line: string) =>
  runLine(start, `cd shop; ${line}`).outcomes.at(-1);

describe("the Hub", () => {
  it("hosts bare repositories and knows its accounts", () => {
    const w = world([]);
    expect(w.hub?.accounts).toEqual(["you", "sam", "ada"]);
    expect(hostedBy(w, SHOP)).toEqual({
      fullName: "sam/shop",
      owner: "sam",
      repo: SHOP,
      rules: [],
      pulls: [],
    });
    expect(repoOf(w, SHOP).bare).toBe(true);
  });

  it("refuses direct pushes to a branch that requires pull requests", () => {
    const w = world([{ branch: "main", requirePullRequest: true }]);
    const out = push(w, "git push");
    expect(out?.output).toEqual({
      stdout: "",
      stderr:
        "remote: error: The Hub protects main: changes arrive through a pull request.\nTo https://hub.test/sam/shop.git\n ! [remote rejected] main -> main (protected branch)\nerror: failed to push some refs to 'https://hub.test/sam/shop.git'\n",
      exitCode: 1,
    });
    expect(out?.effects).toEqual([
      { kind: "refused", code: "remote-rejected", subject: "main" },
    ]);
    expect(repoOf(out?.world ?? w, SHOP).refs.size).toBe(0);
    expect(
      push(w, "git switch -q -c fix; git push -q -u origin fix")?.output
        .exitCode,
    ).toBe(0);
  });

  it("allows direct pushes but refuses force pushes and deletions on a protected branch", () => {
    const pushed = runLine(
      world([{ branch: "main", requirePullRequest: false }]),
      "cd shop; git push -q",
    ).world;
    expect(repoOf(pushed, SHOP).refs.size).toBe(1);
    const forced = push(
      pushed,
      'echo b > b.txt; git add b.txt; git commit -q -m "B"; git push -q; git switch -q -C main HEAD~1; echo c > c.txt; git add c.txt; git commit -q -m "C"; git push --force',
    );
    expect(forced?.output.stderr).toContain(
      "remote: error: The Hub protects main: force pushes would rewrite its history.\n",
    );
    expect(forced?.output.stderr).toMatch(
      / ! \[remote rejected\] main -> main \(protected branch\)\n/,
    );
    expect(pushRefusal(pushed, SHOP, "main", "force")?.message).toBe(
      "The Hub protects main: force pushes would rewrite its history.",
    );
    expect(
      push(pushed, "git push origin --delete main")?.output.stderr,
    ).toContain(" ! [remote rejected] main (protected branch)\n");
    expect(pushRefusal(pushed, SHOP, "other", "force")).toBeNull();
  });
});
