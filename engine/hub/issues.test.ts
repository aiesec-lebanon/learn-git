import { describe, expect, it } from "vitest";
import { narrate } from "../narration/narrate";
import { runLine } from "../run";
import { hostedRepo } from "./state";
import { hub, pullOf, SHOP, shopWorld } from "../test/hub";
import type { HubAction, Issue, World } from "../types";
import { hubActionText } from "./actions";
import { issueLinks } from "./issues";
import { issueTimeline } from "./timeline";

const issueOf = (world: World, number: number): Issue => {
  const found = hostedRepo(world, SHOP).issues.find((i) => i.number === number);
  if (!found) throw new Error(`No issue #${number}`);
  return found;
};

const openIssue = (
  world: World,
  change: Partial<Extract<HubAction, { type: "open-issue" }>> = {},
  actor = "sam",
) =>
  hub(
    world,
    { type: "open-issue", repo: SHOP, title: "Menu misses four", ...change },
    actor,
  );

const doIt = (world: World, action: HubAction, actor = "you") =>
  hub(world, action, actor);

const openPull = (world: World, body: string, base = "main") =>
  hub(world, {
    type: "open-pull-request",
    repo: SHOP,
    base,
    head: "feature",
    title: "Add four",
    body,
  });

describe("issues", () => {
  it("opens issues numbered with the pull requests", () => {
    const first = openIssue(shopWorld(), {
      body: "It stops at three",
      labels: ["bug", "bug"],
      assignee: "you",
    });
    expect(first.output.exitCode).toBe(0);
    expect(issueOf(first.world, 1)).toEqual({
      number: 1,
      title: "Menu misses four",
      body: "It stops at three",
      author: "sam",
      opened: expect.any(Number),
      state: "open",
      labels: ["bug"],
      assignee: "you",
      comments: [],
      events: [],
    });
    expect(narrate(first.effects, first.world).announcement).toBe(
      'Sam opened issue #1 "Menu misses four" on sam/shop.',
    );
    const pulled = openPull(first.world, "");
    expect(pullOf(pulled.world, 2).number).toBe(2);
    expect(openIssue(pulled.world).effects[0]).toMatchObject({
      event: { number: 3 },
    });
  });

  it("refuses bad titles, labels, assignees and repositories", () => {
    const w = shopWorld();
    expect(openIssue(w, { title: "" }).output.stderr).toBe(
      "The title can't be empty.\n",
    );
    expect(openIssue(w, { labels: ["urgent"] }).output.stderr).toBe(
      'The Hub has no label "urgent".\n',
    );
    expect(openIssue(w, { assignee: "zoe" }).output.stderr).toBe(
      "zoe has no account on the Hub.\n",
    );
    expect(openIssue(w, { repo: "x/y" }).output.stderr).toBe(
      "The Hub has no repository x/y.\n",
    );
    expect(
      doIt(w, { type: "close-issue", repo: SHOP, number: 2 }).output.stderr,
    ).toBe("sam/shop has no issue #2.\n");
  });

  it("closes, reopens, labels, assigns and takes comments, in its timeline", () => {
    let w = openIssue(shopWorld()).world;
    const steps: [HubAction, string][] = [
      [
        {
          type: "label-issue",
          repo: SHOP,
          number: 1,
          labels: ["bug", "help wanted"],
        },
        "You labeled issue #1 bug, help wanted.",
      ],
      [
        { type: "assign-issue", repo: SHOP, number: 1, assignee: "sam" },
        "You assigned issue #1 to Sam.",
      ],
      [
        { type: "assign-issue", repo: SHOP, number: 1, assignee: "you" },
        "You assigned issue #1 to you.",
      ],
      [
        { type: "comment", repo: SHOP, number: 1, body: "On it" },
        "You commented on #1 in sam/shop.",
      ],
      [
        { type: "close-issue", repo: SHOP, number: 1 },
        "You closed issue #1 on sam/shop.",
      ],
      [
        { type: "reopen-issue", repo: SHOP, number: 1 },
        "You reopened issue #1 on sam/shop.",
      ],
      [
        { type: "assign-issue", repo: SHOP, number: 1, assignee: null },
        "You unassigned issue #1.",
      ],
      [
        { type: "label-issue", repo: SHOP, number: 1, labels: [] },
        "You removed the labels from issue #1.",
      ],
    ];
    for (const [action, said] of steps) {
      const out = doIt(w, action);
      expect(out.output.stderr).toBe("");
      expect(narrate(out.effects, out.world).announcement).toBe(said);
      w = out.world;
    }
    const issue = issueOf(w, 1);
    expect(issue).toMatchObject({ state: "open", labels: [], assignee: null });
    expect(
      issueTimeline(issue).map((i) =>
        i.kind === "comment" ? "comment" : i.event.kind,
      ),
    ).toEqual([
      "labeled",
      "assigned",
      "assigned",
      "comment",
      "closed",
      "reopened",
      "assigned",
      "labeled",
    ]);
    expect(
      doIt(w, { type: "reopen-issue", repo: SHOP, number: 1 }).output.stderr,
    ).toBe("Issue #1 is already open.\n");
    const closed = doIt(w, {
      type: "close-issue",
      repo: SHOP,
      number: 1,
    }).world;
    expect(
      doIt(closed, { type: "close-issue", repo: SHOP, number: 1 }).output
        .stderr,
    ).toBe("Issue #1 is already closed.\n");
    expect(
      doIt(w, { type: "label-issue", repo: SHOP, number: 1, labels: ["x"] })
        .output.stderr,
    ).toBe('The Hub has no label "x".\n');
    expect(
      doIt(w, { type: "assign-issue", repo: SHOP, number: 1, assignee: "x" })
        .output.stderr,
    ).toBe("x has no account on the Hub.\n");
    expect(hubActionText({ type: "open-issue", repo: SHOP, title: "T" })).toBe(
      'Hub: open issue "T"',
    );
    expect(
      hubActionText({ type: "label-issue", repo: SHOP, number: 1, labels: [] }),
    ).toBe("Hub: label issue #1");
  });
});

describe("closing issues from pull requests", () => {
  it("closes the issue when a pull request into the default branch merges", () => {
    let w = openIssue(shopWorld()).world;
    w = openPull(w, "Fixes #1 and closes #9").world;
    expect(issueLinks(w, SHOP, 1)).toEqual([
      { number: 2, title: "Add four", state: "open", closes: true },
    ]);
    const merged = doIt(w, {
      type: "merge-pull-request",
      repo: SHOP,
      number: 2,
    });
    expect(merged.effects.at(-1)).toEqual({
      kind: "hub",
      actor: "you",
      event: { type: "issue-closed", repo: SHOP, number: 1, pull: 2 },
    });
    expect(narrate(merged.effects, merged.world).whatHappened.at(-1)).toBe(
      "Pull request #2 closed issue #1 on sam/shop.",
    );
    expect(issueOf(merged.world, 1)).toMatchObject({
      state: "closed",
      events: [{ kind: "closed", by: "you", pull: 2 }],
    });
    expect(issueLinks(merged.world, SHOP, 1)[0]?.state).toBe("merged");
  });

  it("leaves the issue open when the pull request targets another branch or it is already closed", () => {
    const next = runLine(
      openIssue(shopWorld()).world,
      "git switch -q main && git switch -q -c next && git push -q -u origin next",
    ).world;
    const into = openPull(next, "Fixes #1", "next").world;
    expect(issueLinks(into, SHOP, 1)).toEqual([
      { number: 2, title: "Add four", state: "open", closes: false },
    ]);
    const merged = doIt(into, {
      type: "merge-pull-request",
      repo: SHOP,
      number: 2,
    });
    expect(merged.output.exitCode).toBe(0);
    expect(issueOf(merged.world, 1).state).toBe("open");
    const open = openPull(openIssue(shopWorld()).world, "Fixes #1");
    const closedFirst = doIt(open.world, {
      type: "close-issue",
      repo: SHOP,
      number: 1,
    }).world;
    const again = doIt(closedFirst, {
      type: "merge-pull-request",
      repo: SHOP,
      number: 2,
    });
    expect(again.effects.filter((e) => e.kind === "hub")).toHaveLength(1);
    expect(issueOf(again.world, 1).events).toHaveLength(1);
  });
});
