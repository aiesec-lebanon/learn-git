import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { hub, pullOf, SHOP, withPull } from "../test/hub";
import type { HubAction, World } from "../types";
import { narrate } from "../narration/narrate";
import { hubActionText } from "./actions";
import { reviewDecision } from "./reviews";
import { pullTimeline } from "./timeline";

type ReviewInput = Omit<
  Extract<HubAction, { type: "review" }>,
  "type" | "repo" | "number"
>;

const review = (world: World, input: ReviewInput, actor = "sam", number = 1) =>
  hub(world, { type: "review", repo: SHOP, number, ...input }, actor);

const comment = (world: World, body: string, actor = "sam", number = 1) =>
  hub(world, { type: "comment", repo: SHOP, number, body }, actor);

describe("comments on a pull request", () => {
  it("adds conversation comments", () => {
    const out = comment(withPull(), "Looks tasty");
    expect(out.output.exitCode).toBe(0);
    expect(pullOf(out.world, 1).comments).toEqual([
      { author: "sam", body: "Looks tasty", time: expect.any(Number) },
    ]);
    expect(narrate(out.effects, out.world).announcement).toBe(
      "Sam commented on #1 in sam/shop.",
    );
    expect(
      hubActionText({ type: "comment", repo: SHOP, number: 1, body: "x" }),
    ).toBe("Hub: comment on #1");
  });

  it("refuses empty comments and unknown numbers", () => {
    expect(comment(withPull(), " ").output.stderr).toBe(
      "The comment can't be empty.\n",
    );
    expect(comment(withPull(), "Hi", "sam", 9).output.stderr).toBe(
      "sam/shop has no pull request #9.\n",
    );
    expect(
      hub(withPull(), { type: "comment", repo: "x/y", number: 1, body: "Hi" })
        .output.stderr,
    ).toBe("The Hub has no repository x/y.\n");
  });
});

describe("reviews", () => {
  it("records a review with line comments on the head it saw", () => {
    const w = withPull();
    const out = review(w, {
      state: "changes-requested",
      body: "One fix",
      comments: [{ path: "menu.txt", line: 4, body: "Spell it out: four (4)" }],
    });
    expect(out.output.exitCode).toBe(0);
    const [saved] = pullOf(out.world, 1).reviews;
    expect(saved).toMatchObject({
      author: "sam",
      state: "changes-requested",
      body: "One fix",
      comments: [{ path: "menu.txt", line: 4, body: "Spell it out: four (4)" }],
    });
    expect(saved?.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(narrate(out.effects, out.world).announcement).toBe(
      "Sam requested changes on pull request #1 in sam/shop.",
    );
    expect(
      hubActionText({
        type: "review",
        repo: SHOP,
        number: 1,
        state: "approved",
      }),
    ).toBe("Hub: approve #1");
  });

  it("refuses reviews the Hub would not take", () => {
    const w = withPull();
    const cases: [ReviewInput, string, string][] = [
      [
        { state: "approved" },
        "you",
        "Authors can't approve or request changes on their own pull request.",
      ],
      [
        { state: "changes-requested" },
        "sam",
        "Requesting changes needs a comment saying what to change.",
      ],
      [{ state: "commented" }, "sam", "A review comment can't be empty."],
      [
        {
          state: "commented",
          comments: [{ path: "menu.txt", line: 9, body: "x" }],
        },
        "sam",
        "Line 9 of menu.txt is not part of the diff.",
      ],
      [
        {
          state: "commented",
          comments: [{ path: "other.txt", line: 1, body: "x" }],
        },
        "sam",
        "Line 1 of other.txt is not part of the diff.",
      ],
      [
        {
          state: "commented",
          comments: [{ path: "menu.txt", line: 1, body: "" }],
        },
        "sam",
        "The comment can't be empty.",
      ],
    ];
    for (const [input, actor, message] of cases) {
      expect(review(w, input, actor).output.stderr).toBe(`${message}\n`);
    }
    expect(
      review(w, { state: "commented", body: "Self note" }, "you").output
        .exitCode,
    ).toBe(0);
    expect(review(w, { state: "approved" }, "sam", 4).output.stderr).toBe(
      "sam/shop has no pull request #4.\n",
    );
  });

  it("keeps each reviewer's latest verdict", () => {
    let w = withPull();
    w = review(w, { state: "changes-requested", body: "Fix it" }).world;
    w = review(w, { state: "commented", body: "Still waiting" }, "ada").world;
    expect(reviewDecision(pullOf(w, 1))).toEqual({
      approved: [],
      changesRequested: ["sam"],
    });
    w = review(w, { state: "approved" }).world;
    w = review(w, { state: "commented", body: "Nice" }).world;
    expect(reviewDecision(pullOf(w, 1))).toEqual({
      approved: ["sam"],
      changesRequested: [],
    });
  });
});

describe("the pull request timeline", () => {
  it("orders the description, commits, comments and reviews in time", () => {
    let w = withPull(undefined, "Adds the fourth item");
    w = review(w, {
      state: "changes-requested",
      body: "Capital F",
      comments: [{ path: "menu.txt", line: 4, body: "Four" }],
    }).world;
    w = runLine(
      w,
      'echo one > menu.txt && echo two >> menu.txt && echo three >> menu.txt && echo Four >> menu.txt && git add . && git commit -q -m "Capitalize" && git push -q',
    ).world;
    w = comment(w, "Done", "you").world;
    w = review(w, { state: "approved" }).world;
    expect(
      pullTimeline(w, SHOP, pullOf(w, 1)).map((item) =>
        item.kind === "commit"
          ? `commit ${item.subject} by ${item.author}`
          : item.kind === "review"
            ? `review ${item.review.state} by ${item.review.author}`
            : `${item.kind} by ${item.author}`,
      ),
    ).toEqual([
      "opened by you",
      "commit Add four by Sam Lee",
      "review changes-requested by sam",
      "commit Capitalize by Sam Lee",
      "comment by you",
      "review approved by sam",
    ]);
  });
});
