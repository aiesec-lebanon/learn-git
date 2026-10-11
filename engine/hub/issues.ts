import type {
  Effect,
  HostedRepo,
  HubAction,
  Issue,
  IssueEvent,
  PullRequest,
  World,
} from "../types";
import { closingIssues } from "./keywords";
import { closesIssues } from "./pulls";
import {
  refuseHub,
  textProblem,
  type HubContext,
  type HubResult,
} from "./result";
import { nextNumber, withHosted } from "./state";

/** The labels every repository offers. */
export const HUB_LABELS = [
  "bug",
  "documentation",
  "enhancement",
  "good first issue",
  "help wanted",
  "question",
] as const;

type IssueAction = Extract<
  HubAction,
  {
    type:
      | "open-issue"
      | "close-issue"
      | "reopen-issue"
      | "label-issue"
      | "assign-issue";
  }
>;

export type LocatedIssue =
  | { readonly ok: true; readonly hosted: HostedRepo; readonly issue: Issue }
  | { readonly ok: false; readonly message: string };

/** A repository's issue by number, or why there is none. */
export function locateIssue(
  world: World,
  fullName: string,
  number: number,
): LocatedIssue {
  const hosted = world.hub?.repos.get(fullName);
  if (!hosted)
    return { ok: false, message: `The Hub has no repository ${fullName}.` };
  const issue = hosted.issues.find((i) => i.number === number);
  return issue
    ? { ok: true, hosted, issue }
    : { ok: false, message: `${fullName} has no issue #${number}.` };
}

/** The world with one issue replaced. */
export function replaceIssue(
  world: World,
  hosted: HostedRepo,
  issue: Issue,
): World {
  return withHosted(world, {
    ...hosted,
    issues: hosted.issues.map((i) => (i.number === issue.number ? issue : i)),
  });
}

export type IssueLink = {
  readonly number: number;
  readonly title: string;
  readonly state: PullRequest["state"];
  /** Whether merging it closes the issue (it targets the default branch). */
  readonly closes: boolean;
};

/** Pull requests whose description closes the issue with a keyword. */
export function issueLinks(
  world: World,
  fullName: string,
  number: number,
): IssueLink[] {
  const hosted = world.hub?.repos.get(fullName);
  return (hosted?.pulls ?? [])
    .filter((p) => closingIssues(p.body).includes(number))
    .map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      closes: closesIssues(world, fullName, p).includes(number),
    }));
}

/** Closes the open issues a just-merged pull request names with closing keywords. */
export function closeLinkedIssues(
  world: World,
  fullName: string,
  pull: PullRequest,
  ctx: HubContext,
): { world: World; effects: Effect[] } {
  let next = world;
  const effects: Effect[] = [];
  for (const number of closesIssues(world, fullName, pull)) {
    const found = locateIssue(next, fullName, number);
    if (!found.ok || found.issue.state === "closed") continue;
    const event: IssueEvent = {
      kind: "closed",
      by: ctx.actor,
      time: ctx.time,
      pull: pull.number,
    };
    next = replaceIssue(next, found.hosted, {
      ...found.issue,
      state: "closed",
      events: [...found.issue.events, event],
    });
    effects.push({
      kind: "hub",
      actor: ctx.actor,
      event: {
        type: "issue-closed",
        repo: fullName,
        number,
        pull: pull.number,
      },
    });
  }
  return { world: next, effects };
}

function labelProblem(labels: readonly string[]): string | null {
  const unknown = labels.find(
    (l) => !(HUB_LABELS as readonly string[]).includes(l),
  );
  return unknown === undefined ? null : `The Hub has no label "${unknown}".`;
}

function assigneeProblem(world: World, assignee: string | null): string | null {
  return assignee === null || world.hub?.accounts.includes(assignee)
    ? null
    : `${assignee} has no account on the Hub.`;
}

function openIssue(
  ctx: HubContext,
  action: Extract<HubAction, { type: "open-issue" }>,
): HubResult {
  const { repo, title, body = "", labels = [], assignee = null } = action;
  const hosted = ctx.world.hub?.repos.get(repo);
  if (!hosted) return refuseHub(`The Hub has no repository ${repo}.`);
  const problem =
    textProblem("The title", title, true) ??
    textProblem("The description", body, false) ??
    labelProblem(labels) ??
    assigneeProblem(ctx.world, assignee);
  if (problem) return refuseHub(problem);
  const issue: Issue = {
    number: nextNumber(hosted),
    title: title.trim(),
    body,
    author: ctx.actor,
    opened: ctx.time,
    state: "open",
    labels: [...new Set(labels)],
    assignee,
    comments: [],
    events: [],
  };
  return {
    ok: true,
    world: withHosted(ctx.world, {
      ...hosted,
      issues: [...hosted.issues, issue],
    }),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event: {
          type: "issue-opened",
          repo,
          number: issue.number,
          title: issue.title,
        },
      },
    ],
  };
}

/** Changes one issue: the new issue and its event, or why not. */
function change(
  ctx: HubContext,
  issue: Issue,
  action: Exclude<IssueAction, { type: "open-issue" }>,
): { issue: Issue; event: IssueEvent } | string {
  const at = { by: ctx.actor, time: ctx.time };
  switch (action.type) {
    case "close-issue":
      return issue.state === "closed"
        ? `Issue #${issue.number} is already closed.`
        : {
            issue: { ...issue, state: "closed" },
            event: { kind: "closed", ...at },
          };
    case "reopen-issue":
      return issue.state === "open"
        ? `Issue #${issue.number} is already open.`
        : {
            issue: { ...issue, state: "open" },
            event: { kind: "reopened", ...at },
          };
    case "label-issue": {
      const labels = [...new Set(action.labels)];
      return (
        labelProblem(labels) ?? {
          issue: { ...issue, labels },
          event: { kind: "labeled", ...at, labels },
        }
      );
    }
    case "assign-issue":
      return (
        assigneeProblem(ctx.world, action.assignee) ?? {
          issue: { ...issue, assignee: action.assignee },
          event: { kind: "assigned", ...at, assignee: action.assignee },
        }
      );
  }
}

export function runIssueAction(
  ctx: HubContext,
  action: IssueAction,
): HubResult {
  if (action.type === "open-issue") return openIssue(ctx, action);
  const found = locateIssue(ctx.world, action.repo, action.number);
  if (!found.ok) return refuseHub(found.message);
  const changed = change(ctx, found.issue, action);
  if (typeof changed === "string") return refuseHub(changed);
  const { issue, event } = changed;
  const { repo, number } = action;
  return {
    ok: true,
    world: replaceIssue(ctx.world, found.hosted, {
      ...issue,
      events: [...issue.events, event],
    }),
    effects: [
      {
        kind: "hub",
        actor: ctx.actor,
        event:
          event.kind === "closed"
            ? { type: "issue-closed", repo, number }
            : event.kind === "reopened"
              ? { type: "issue-reopened", repo, number }
              : event.kind === "labeled"
                ? { type: "issue-labeled", repo, number, labels: event.labels }
                : {
                    type: "issue-assigned",
                    repo,
                    number,
                    assignee: event.assignee,
                  },
      },
    ],
  };
}
