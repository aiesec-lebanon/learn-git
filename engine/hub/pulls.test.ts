import { describe, expect, it } from "vitest";
import { LIMITS } from "../limits";
import { runLine } from "../run";
import { hub, pullOf, SHOP, shopWorld, withPull } from "../test/hub";
import type { HubAction, World } from "../types";
import { closingIssues } from "./keywords";
import { closesIssues, compareBranches } from "./pulls";

const open = (
  world: World,
  change: Partial<Extract<HubAction, { type: "open-pull-request" }>> = {},
) =>
  hub(world, {
    type: "open-pull-request",
    repo: SHOP,
    base: "main",
    head: "feature",
    title: "Add four",
    ...change,
  });

const compare = (world: World, base = "main", head = "feature") => {
  const result = compareBranches(world, SHOP, base, head);
  if (!result.ok) throw new Error(result.message);
  return result.view;
};

describe("opening a pull request", () => {
  it("records the pull request with the next number", () => {
    const out = open(shopWorld(), { body: "Fixes #3" });
    expect(out.output.exitCode).toBe(0);
    expect(out.meta.counted).toBe(true);
    expect(out.effects).toEqual([
      {
        kind: "hub",
        actor: "you",
        event: {
          type: "pull-request-opened",
          repo: SHOP,
          number: 1,
          title: "Add four",
        },
      },
    ]);
    expect(pullOf(out.world, 1)).toEqual({
      number: 1,
      title: "Add four",
      body: "Fixes #3",
      author: "you",
      base: "main",
      head: "feature",
      opened: out.world.seq * 60 - 60 + 1767225600,
      state: "open",
    });
    const second = hub(
      runLine(
        out.world,
        "git switch -q -c other && echo x > x.txt && git add . && git commit -q -m X && git push -q -u origin other",
      ).world,
      {
        type: "open-pull-request",
        repo: SHOP,
        base: "main",
        head: "other",
        title: "X",
      },
    );
    expect(pullOf(second.world, 2).head).toBe("other");
  });

  it("refuses what cannot become a pull request", () => {
    const w = withPull();
    const refusals: [
      Partial<Extract<HubAction, { type: "open-pull-request" }>>,
      string,
    ][] = [
      [{ repo: "sam/nope" }, "The Hub has no repository sam/nope."],
      [{ head: "nope" }, "sam/shop has no branch named nope."],
      [{ head: "main" }, "Pick two different branches to compare."],
      [
        { base: "feature", head: "main" },
        "feature already has every commit on main.",
      ],
      [{}, "A pull request from feature into main is already open: #1."],
    ];
    for (const [change, message] of refusals) {
      const out = open(w, change);
      expect(out.output).toEqual({
        stdout: "",
        stderr: `${message}\n`,
        exitCode: 1,
      });
      expect(out.world.hub).toBe(w.hub);
    }
    const fresh = shopWorld();
    expect(open(fresh, { title: "  " }).output.stderr).toBe(
      "The title can't be empty.\n",
    );
    expect(
      open(fresh, { body: "x".repeat(LIMITS.hubTextChars + 1) }).output.stderr,
    ).toBe(
      `The description is longer than ${LIMITS.hubTextChars} characters.\n`,
    );
    expect(
      open(fresh, { body: "x".repeat(LIMITS.hubTextChars) }).output.exitCode,
    ).toBe(0);
  });

  it("refuses branches that share no history", () => {
    const w = runLine(
      shopWorld(),
      "cd ~ && mkdir other && cd other && git init -q && echo x > x.txt && git add . && git commit -q -m X && git branch -m lone && git remote add origin https://hub.test/sam/shop.git && git push -q origin lone",
    );
    expect(w.outcomes.every((o) => o.output.exitCode === 0)).toBe(true);
    expect(open(w.world, { head: "lone" }).output.stderr).toBe(
      "main and lone share no history, so there is nothing to compare.\n",
    );
  });
});

describe("comparing branches", () => {
  it("diffs from the merge base (three dots), so new commits on base do not show", () => {
    const moved = runLine(
      shopWorld(),
      'git switch -q main && echo zero > zero.txt && git add . && git commit -q -m "Add zero" && git push -q',
    ).world;
    const view = compare(moved);
    expect(view.commits.map((c) => c.subject)).toEqual(["Add four"]);
    expect(view.files.map((f) => [f.path, f.added, f.deleted])).toEqual([
      ["menu.txt", 1, 0],
    ]);
    expect(view.mergeable).toEqual({ kind: "clean" });
    expect(view.mergeBase).not.toBe(view.base);
  });

  it("reports conflicts from a dry-run merge", () => {
    const moved = runLine(
      shopWorld(),
      'git switch -q main && echo one > menu.txt && echo two >> menu.txt && echo THREE >> menu.txt && echo FOUR >> menu.txt && git add . && git commit -q -m "Shout" && git push -q',
    ).world;
    expect(compare(moved).mergeable).toEqual({
      kind: "conflicts",
      paths: ["menu.txt"],
    });
  });
});

describe("closing keywords", () => {
  it("finds every closing keyword in any case, once per issue", () => {
    expect(
      closingIssues(
        "Fixes #3. closes #4, RESOLVED #5; fix: #6 Close #7 resolves #3 fixed #8 resolve #9 closed #10",
      ),
    ).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("ignores mentions, other words and malformed references", () => {
    expect(
      closingIssues(
        "See #3. prefix #4 fixes#5 fixes # 6 fixes #x closing #7 refixes #8",
      ),
    ).toEqual([]);
  });

  it("closes issues only through pull requests into the default branch", () => {
    const into = withPull(shopWorld(), "Fixes #7");
    expect(closesIssues(into, SHOP, pullOf(into, 1))).toEqual([7]);
    expect(
      closesIssues(into, SHOP, {
        ...pullOf(into, 1),
        base: "feature",
        head: "other",
      }),
    ).toEqual([]);
  });
});
