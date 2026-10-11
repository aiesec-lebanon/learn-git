import type { HubAction, PullRequest, Review } from "../types";
import { locatePull, pullCompare, replacePull } from "./pulls";
import {
  refuseHub,
  textProblem,
  type HubContext,
  type HubResult,
} from "./result";

export function commentOnPull(
  ctx: HubContext,
  action: Extract<HubAction, { type: "comment" }>,
): HubResult {
  const found = locatePull(ctx.world, action.repo, action.number);
  if (!found.ok) return refuseHub(found.message);
  const problem = textProblem("The comment", action.body, true);
  if (problem) return refuseHub(problem);
  const { hosted, pull } = found;
  const comment = { author: ctx.actor, body: action.body, time: ctx.time };
  return {
    ok: true,
    world: replacePull(ctx.world, hosted, {
      ...pull,
      comments: [...pull.comments, comment],
    }),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event: {
          type: "comment-added",
          repo: action.repo,
          number: action.number,
        },
      },
    ],
  };
}

export function reviewPull(
  ctx: HubContext,
  action: Extract<HubAction, { type: "review" }>,
): HubResult {
  const { repo, number, state, body = "", comments = [] } = action;
  const found = locatePull(ctx.world, repo, number);
  if (!found.ok) return refuseHub(found.message);
  const { hosted, pull } = found;
  if (pull.state !== "open")
    return refuseHub(`Pull request #${number} is ${pull.state}.`);
  if (state !== "commented" && pull.author === ctx.actor)
    return refuseHub(
      "Authors can't approve or request changes on their own pull request.",
    );
  if (state === "changes-requested" && !body.trim())
    return refuseHub(
      "Requesting changes needs a comment saying what to change.",
    );
  if (state === "commented" && !body.trim() && !comments.length)
    return refuseHub("A review comment can't be empty.");
  const compared = pullCompare(ctx.world, repo, pull);
  if (!compared)
    return refuseHub(`Pull request #${number} has nothing to review.`);
  for (const c of comments) {
    const file = compared.files.find((f) => f.path === c.path);
    const onDiff = file?.hunks.some((h) =>
      h.lines.some((l) => l.new === c.line),
    );
    if (!onDiff)
      return refuseHub(`Line ${c.line} of ${c.path} is not part of the diff.`);
  }
  const problem = [
    textProblem("The review", body, false),
    ...comments.map((c) => textProblem("The comment", c.body, true)),
  ].find(Boolean);
  if (problem) return refuseHub(problem);
  const review: Review = {
    author: ctx.actor,
    state,
    body,
    time: ctx.time,
    commit: compared.head,
    comments,
  };
  return {
    ok: true,
    world: replacePull(ctx.world, hosted, {
      ...pull,
      reviews: [...pull.reviews, review],
    }),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event: { type: "review-submitted", repo, number, state },
      },
    ],
  };
}

/** Each reviewer's standing verdict: their latest approval or change request (comments don't change it). */
export function reviewDecision(pull: PullRequest): {
  readonly approved: readonly string[];
  readonly changesRequested: readonly string[];
} {
  const latest = new Map<string, Review["state"]>();
  for (const review of pull.reviews) {
    if (review.state !== "commented") latest.set(review.author, review.state);
  }
  const who = (state: Review["state"]) =>
    [...latest].filter(([, s]) => s === state).map(([author]) => author);
  return {
    approved: who("approved"),
    changesRequested: who("changes-requested"),
  };
}
