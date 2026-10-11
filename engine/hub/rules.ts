import type { RepoId, World } from "../types";
import { hostedBy } from "./state";

export type RuleRefusal = {
  /** The reason Git shows in `! [remote rejected] main -> main (<reason>)`. */
  readonly reason: string;
  /** The Hub's own explanation, sent back as a `remote:` line. */
  readonly message: string;
};

export type RefUpdateKind = "update" | "force" | "delete";

/** Why the Hub refuses to move `branch` this way, or null when its rules allow it. */
export function pushRefusal(
  world: World,
  repo: RepoId,
  branch: string,
  kind: RefUpdateKind,
): RuleRefusal | null {
  const rule = hostedBy(world, repo)?.rules.find((r) => r.branch === branch);
  if (!rule) return null;
  const reason = "protected branch";
  if (kind === "force") {
    return {
      reason,
      message: `The Hub protects ${branch}: force pushes would rewrite its history.`,
    };
  }
  if (kind === "delete") {
    return {
      reason,
      message: `The Hub protects ${branch}: it cannot be deleted.`,
    };
  }
  return rule.requirePullRequest
    ? {
        reason,
        message: `The Hub protects ${branch}: changes arrive through a pull request.`,
      }
    : null;
}
