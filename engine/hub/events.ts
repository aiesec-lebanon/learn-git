import type { HubEvent } from "../types";
import { LEARNER } from "../world/defaults";

const REVIEWED = {
  commented: "reviewed",
  approved: "approved",
  "changes-requested": "requested changes on",
} as const;

const who = (actor: string) =>
  actor === LEARNER ? "You" : actor.charAt(0).toUpperCase() + actor.slice(1);

/** One plain sentence for a Hub event, for "What happened" and the announcer. */
export function hubEventSentence(actor: string, event: HubEvent): string {
  switch (event.type) {
    case "repository-created":
      return `${who(actor)} created ${event.repo} on the Hub.`;
    case "pull-request-opened":
      return `${who(actor)} opened pull request #${event.number} "${event.title}" on ${event.repo}.`;
    case "comment-added":
      return `${who(actor)} commented on #${event.number} in ${event.repo}.`;
    case "review-submitted":
      return `${who(actor)} ${REVIEWED[event.state]} pull request #${event.number} in ${event.repo}.`;
    case "pull-request-merged":
      return `${who(actor)} merged pull request #${event.number} into ${event.base} on ${event.repo}.`;
    case "branch-deleted":
      return `${who(actor)} deleted the branch ${event.branch} on ${event.repo}.`;
    case "branch-restored":
      return `${who(actor)} restored the branch ${event.branch} on ${event.repo}.`;
    case "issue-opened":
      return `${who(actor)} opened issue #${event.number} "${event.title}" on ${event.repo}.`;
    case "issue-closed":
      return event.pull === undefined
        ? `${who(actor)} closed issue #${event.number} on ${event.repo}.`
        : `Pull request #${event.pull} closed issue #${event.number} on ${event.repo}.`;
    case "issue-reopened":
      return `${who(actor)} reopened issue #${event.number} on ${event.repo}.`;
    case "issue-labeled":
      return event.labels.length
        ? `${who(actor)} labeled issue #${event.number} ${event.labels.join(", ")}.`
        : `${who(actor)} removed the labels from issue #${event.number}.`;
    case "issue-assigned":
      return event.assignee === null
        ? `${who(actor)} unassigned issue #${event.number}.`
        : `${who(actor)} assigned issue #${event.number} to ${who(event.assignee).replace(/^You$/, "you")}.`;
    default: {
      const never: never = event;
      return never;
    }
  }
}
