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
    default: {
      const never: never = event;
      return never;
    }
  }
}
