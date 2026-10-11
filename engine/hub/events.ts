import type { HubEvent } from "../types";
import { LEARNER } from "../world/defaults";

const who = (actor: string) =>
  actor === LEARNER ? "You" : actor.charAt(0).toUpperCase() + actor.slice(1);

/** One plain sentence for a Hub event, for "What happened" and the announcer. */
export function hubEventSentence(actor: string, event: HubEvent): string {
  switch (event.type) {
    case "repository-created":
      return `${who(actor)} created ${event.repo} on the Hub.`;
    default: {
      const never: never = event.type;
      return never;
    }
  }
}
