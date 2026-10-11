import type { Oid, PullRequest, Review, World } from "../types";
import { pullCompare } from "./pulls";

export type TimelineItem =
  | {
      readonly kind: "opened";
      readonly time: number;
      readonly author: string;
      readonly body: string;
    }
  | {
      readonly kind: "commit";
      readonly time: number;
      readonly oid: Oid;
      readonly subject: string;
      /** The commit author's name. */
      readonly author: string;
    }
  | {
      readonly kind: "comment";
      readonly time: number;
      readonly author: string;
      readonly body: string;
    }
  | { readonly kind: "review"; readonly time: number; readonly review: Review }
  | {
      readonly kind: "merged";
      readonly time: number;
      readonly by: string;
      readonly commit: Oid;
    }
  | {
      readonly kind: "branch-deleted" | "branch-restored";
      readonly time: number;
      readonly by: string;
    };

/**
 * A pull request's conversation, oldest first: the description, its
 * commits (those made before it opened show right after it), comments,
 * reviews, the merge and head-branch deletions and restorations. Derived from the Hub state and the repository each time.
 */
export function pullTimeline(
  world: World,
  fullName: string,
  pull: PullRequest,
): TimelineItem[] {
  const items: TimelineItem[] = [
    { kind: "opened", time: pull.opened, author: pull.author, body: pull.body },
  ];
  for (const c of pullCompare(world, fullName, pull)?.commits ?? []) {
    items.push({
      kind: "commit",
      time: Math.max(c.author.time, pull.opened),
      oid: c.oid,
      subject: c.subject,
      author: c.author.name,
    });
  }
  for (const c of pull.comments) items.push({ kind: "comment", ...c });
  for (const review of pull.reviews)
    items.push({ kind: "review", time: review.time, review });
  if (pull.merged) {
    const { by, time, commit } = pull.merged;
    items.push({ kind: "merged", time, by, commit });
  }
  for (const e of pull.branchEvents)
    items.push({ kind: `branch-${e.kind}`, time: e.time, by: e.by });
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.time - b.item.time || a.i - b.i)
    .map(({ item }) => item);
}
