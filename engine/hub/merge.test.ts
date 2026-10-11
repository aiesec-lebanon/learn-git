import { describe, expect, it } from "vitest";
import { countPar } from "../par";
import { readObject } from "../objects/pool";
import { branchRef } from "../refs/names";
import { runLine } from "../run";
import { hub, pullOf, SHOP, shopWorld, withPull } from "../test/hub";
import type { BranchRule, HubAction, Oid, World } from "../types";
import { repoOf } from "../world/access";
import { createWorld } from "../world/create";
import { hostedRepoId } from "../world/network";
import { hubActionText } from "./actions";
import { mergeBlockers } from "./merge";
import { pullCompare } from "./pulls";
import { pullTimeline } from "./timeline";

const SHOP_REPO = hostedRepoId(SHOP);
const tip = (world: World, branch: string) =>
  repoOf(world, SHOP_REPO).refs.get(branchRef(branch));

const run = (
  world: World,
  type: Extract<HubAction, { number: number }>["type"],
  actor = "you",
  number = 1,
) => hub(world, { type, repo: SHOP, number } as HubAction, actor);

const merge = (world: World, actor = "you") =>
  run(world, "merge-pull-request", actor);

const withRules = (rules: readonly BranchRule[]): World => {
  const plain = shopWorld();
  const hosted = plain.hub?.repos.get(SHOP);
  if (!hosted || !plain.hub) throw new Error("No shop");
  return {
    ...plain,
    hub: {
      ...plain.hub,
      repos: new Map([[SHOP, { ...hosted, rules }]]),
    },
  };
};

describe("merging a pull request", () => {
  it("creates a merge commit on the Hub only", () => {
    const w = withPull();
    const before = { main: tip(w, "main"), feature: tip(w, "feature") };
    const out = merge(w);
    expect(out.output.exitCode).toBe(0);
    const merged = tip(out.world, "main") as Oid;
    const commit = readObject(out.world.objects, merged, "commit");
    expect(commit.message).toBe(
      "Merge pull request #1 from sam/feature\n\nAdd four\n",
    );
    expect(commit.parents).toEqual([before.main, before.feature]);
    expect(commit.committer.name).toBe("Hub");
    expect(commit.author.name).toBe("Sam Lee");
    expect(out.effects.map((e) => e.kind)).toEqual([
      "hub",
      "object-written",
      "ref-updated",
    ]);
    expect(out.effects[0]).toEqual({
      kind: "hub",
      actor: "you",
      event: {
        type: "pull-request-merged",
        repo: SHOP,
        number: 1,
        base: "main",
      },
    });
    expect(pullOf(out.world, 1)).toMatchObject({
      state: "merged",
      merged: {
        by: "you",
        commit: merged,
        base: before.main,
        head: before.feature,
      },
    });
    const local = repoOf(out.world, "you:/home/you/shop");
    expect(local.refs.get("refs/remotes/origin/main" as never)).toBe(
      before.main,
    );
    const pulled = runLine(
      out.world,
      "git switch -q main && git pull -q",
    ).world;
    expect(
      repoOf(pulled, "you:/home/you/shop").refs.get(branchRef("main")),
    ).toBe(merged);
    expect(
      countPar([
        {
          text: hubActionText({
            type: "merge-pull-request",
            repo: SHOP,
            number: 1,
          }),
          outcome: out,
        },
      ]),
    ).toBe(1);
  });

  it("keeps the merged pull request's commits and timeline", () => {
    const out = merge(withPull());
    const pull = pullOf(out.world, 1);
    expect(
      pullCompare(out.world, SHOP, pull)?.commits.map((c) => c.subject),
    ).toEqual(["Add four"]);
    expect(pullTimeline(out.world, SHOP, pull).map((i) => i.kind)).toEqual([
      "opened",
      "commit",
      "merged",
    ]);
    expect(merge(out.world).output.stderr).toBe("Pull request #1 is merged.\n");
  });

  it("refuses conflicts and pull requests with nothing left to merge", () => {
    const shout = runLine(
      withPull(),
      'git switch -q main && echo one > menu.txt && echo two >> menu.txt && echo THREE >> menu.txt && git add . && git commit -q -m "Shout" && git push -q',
    ).world;
    expect(merge(shout).output.stderr).toBe(
      "This branch has conflicts that must be resolved.\n",
    );
    const done = runLine(
      withPull(),
      "git switch -q main && git merge -q feature && git push -q",
    ).world;
    expect(mergeBlockers(done, SHOP, pullOf(done, 1))).toEqual([
      "main already has every commit on feature.",
    ]);
  });

  it("applies the base branch's review rule", () => {
    let w = withPull(
      withRules([
        { branch: "main", requirePullRequest: true, requiredApprovals: 1 },
      ]),
    );
    expect(merge(w).output.stderr).toBe(
      "main needs 1 approving review before merging.\n",
    );
    w = hub(
      w,
      {
        type: "review",
        repo: SHOP,
        number: 1,
        state: "changes-requested",
        body: "Fix",
      },
      "sam",
    ).world;
    expect(mergeBlockers(w, SHOP, pullOf(w, 1))).toEqual([
      "Changes were requested by sam.",
      "main needs 1 approving review before merging.",
    ]);
    w = hub(
      w,
      { type: "review", repo: SHOP, number: 1, state: "approved" },
      "sam",
    ).world;
    expect(mergeBlockers(w, SHOP, pullOf(w, 1))).toEqual([]);
    expect(merge(w).output.exitCode).toBe(0);
    const two = withPull(
      withRules([
        { branch: "main", requirePullRequest: false, requiredApprovals: 2 },
      ]),
    );
    expect(mergeBlockers(two, SHOP, pullOf(two, 1))).toEqual([
      "main needs 2 approving reviews before merging.",
    ]);
  });
});

describe("deleting and restoring the head branch", () => {
  it("deletes after the merge and restores at the merged tip", () => {
    const w = withPull();
    expect(run(w, "delete-branch").output.stderr).toBe(
      "Merge pull request #1 before deleting its branch.\n",
    );
    const merged = merge(w).world;
    const head = tip(merged, "feature");
    const deleted = run(merged, "delete-branch");
    expect(deleted.effects).toEqual([
      {
        kind: "hub",
        actor: "you",
        event: { type: "branch-deleted", repo: SHOP, branch: "feature" },
      },
      {
        kind: "ref-updated",
        repo: SHOP_REPO,
        ref: branchRef("feature"),
        from: head,
        to: null,
      },
    ]);
    expect(tip(deleted.world, "feature")).toBeUndefined();
    expect(
      mergeBlockers(deleted.world, SHOP, {
        ...pullOf(deleted.world, 1),
        state: "open",
        merged: undefined,
      }),
    ).toEqual(["The branch feature was deleted."]);
    expect(run(deleted.world, "delete-branch").output.stderr).toBe(
      "The branch feature is already deleted.\n",
    );
    const restored = run(deleted.world, "restore-branch", "sam");
    expect(tip(restored.world, "feature")).toBe(head);
    expect(run(restored.world, "restore-branch").output.stderr).toBe(
      "The branch feature already exists.\n",
    );
    expect(
      pullTimeline(restored.world, SHOP, pullOf(restored.world, 1)).map(
        (i) => i.kind,
      ),
    ).toEqual([
      "opened",
      "commit",
      "merged",
      "branch-deleted",
      "branch-restored",
    ]);
    expect(run(w, "merge-pull-request", "you", 7).output.stderr).toBe(
      "sam/shop has no pull request #7.\n",
    );
  });

  it("refuses to delete a protected branch", () => {
    const w = merge(
      withPull(withRules([{ branch: "feature", requirePullRequest: false }])),
    ).world;
    expect(run(w, "delete-branch").output.stderr).toBe(
      "The Hub protects feature: it cannot be deleted.\n",
    );
    expect(createWorld().hub).toBeUndefined();
  });
});
