import { describe, expect, it } from "vitest";
import { narrate } from "../narration/narrate";
import { countPar } from "../par";
import { Session } from "../session";
import { pullOf, SHOP, shopWorld } from "../test/hub";
import type { ActorScript, HubAction } from "../types";
import { withActors } from "../world/actors";
import { hubActionText } from "./actions";

const samReviews: ActorScript = {
  id: "review",
  machine: "sam",
  name: "Sam",
  trigger: { kind: "after-command", pattern: "^Hub: open a pull request" },
  run: [
    {
      type: "review",
      repo: SHOP,
      number: 1,
      state: "changes-requested",
      body: "Almost",
      comments: [{ path: "menu.txt", line: 4, body: "Capital F, please" }],
    },
  ],
};

const OPEN: HubAction = {
  type: "open-pull-request",
  repo: SHOP,
  base: "main",
  head: "feature",
  title: "Add four",
};

describe("scripted collaborators on the Hub", () => {
  it("review through the same actions after the learner opens a pull request", () => {
    const session = new Session(withActors(shopWorld(), [samReviews]));
    const entries = session.act(OPEN);
    expect(entries.map((e) => [e.text, e.actor])).toEqual([
      ["Hub: open a pull request from feature into main", undefined],
      ["Hub: request changes on #1", "Sam"],
    ]);
    const { world, history } = session.getSnapshot();
    expect(pullOf(world, 1).reviews.map((r) => [r.author, r.state])).toEqual([
      ["sam", "changes-requested"],
    ]);
    const samSaid = narrate(entries[1]?.outcome.effects ?? [], world);
    expect(samSaid).toEqual({
      whatHappened: ["Sam requested changes on pull request #1 in sam/shop."],
      announcement: "Sam requested changes on pull request #1 in sam/shop.",
    });
    expect(countPar(history)).toBe(1);
    session.rewindTo(0);
    expect(session.getSnapshot().world.hub?.repos.get(SHOP)?.pulls).toEqual([]);
  });

  it("count successful learner Hub actions for par, not refused ones", () => {
    const session = new Session(shopWorld());
    session.act(OPEN);
    session.act(OPEN);
    session.act({ type: "merge-pull-request", repo: SHOP, number: 1 });
    session.run("git status");
    expect(countPar(session.getSnapshot().history)).toBe(2);
  });

  it("wait while teammates are paused", () => {
    const session = new Session(withActors(shopWorld(), [samReviews]));
    session.setActorsPaused(true);
    expect(session.act(OPEN)).toHaveLength(1);
    expect(session.stepActor().map((e) => e.actor)).toEqual(["Sam"]);
  });

  it("describe every action in words", () => {
    const n = { repo: SHOP, number: 2 };
    const actions: [HubAction, string][] = [
      [{ type: "review", ...n, state: "commented" }, "Hub: review #2"],
      [
        { type: "review", ...n, state: "changes-requested" },
        "Hub: request changes on #2",
      ],
      [{ type: "delete-branch", ...n }, "Hub: delete the branch of #2"],
      [{ type: "restore-branch", ...n }, "Hub: restore the branch of #2"],
      [{ type: "close-issue", ...n }, "Hub: close issue #2"],
      [{ type: "reopen-issue", ...n }, "Hub: reopen issue #2"],
      [{ type: "assign-issue", ...n, assignee: null }, "Hub: assign issue #2"],
    ];
    for (const [action, text] of actions)
      expect(hubActionText(action)).toBe(text);
  });
});
