import { isValidBranchName, shellQuote } from "@/engine";
import type { RepoView } from "../view-model";

/** What the learner carries: HEAD, or a new branch label with its name. */
export type Carried =
  { readonly kind: "head" } | { readonly kind: "label"; readonly name: string };

/** Drop targets by id: `commit:<oid>` or `branch:<name>`. */
export type TargetId = string;

export const commitTarget = (oid: string): TargetId => `commit:${oid}`;
export const branchTarget = (name: string): TargetId => `branch:${name}`;

/** Every drop target in the order keyboard picking visits them: commits, then branches. */
export function dropTargets(view: RepoView): TargetId[] {
  return [
    ...view.commits.map((c) => commitTarget(c.oid)).reverse(),
    ...view.labels
      .filter((l) => l.kind === "branch")
      .map((l) => branchTarget(l.name)),
  ];
}

/** A drop the sandbox runs, or why it snaps back. */
export type Drop =
  | { readonly ok: true; readonly command: string }
  | { readonly ok: false; readonly reason: string };

const refuse = (reason: string): Drop => ({ ok: false, reason });
const run = (command: string): Drop => ({ ok: true, command });

function dropHead(view: RepoView, target: TargetId): Drop {
  const [kind, value = ""] = splitTarget(target);
  if (kind === "branch") {
    if (view.head.kind === "branch" && view.head.branch === value) {
      return refuse(`HEAD is already on ${value}.`);
    }
    return run(`git switch ${shellQuote(value)}`);
  }
  const commit = view.commits.find((c) => c.oid === value);
  if (!commit) return refuse("Drop HEAD on a commit or a branch label.");
  if (view.head.kind === "detached" && view.head.target === commit.oid) {
    return refuse("HEAD already points at that commit.");
  }
  return run(`git switch --detach ${commit.short}`);
}

function dropLabel(view: RepoView, name: string, target: TargetId): Drop {
  const [kind, value = ""] = splitTarget(target);
  const commit = view.commits.find((c) => c.oid === value);
  if (kind !== "commit" || !commit) {
    return refuse(
      "A branch points at exactly one commit. Drop the label on a commit.",
    );
  }
  const trimmed = name.trim();
  if (!trimmed) return refuse("Name the new label first.");
  if (!isValidBranchName(trimmed)) {
    return refuse(`Git doesn't allow "${trimmed}" as a branch name.`);
  }
  if (view.labels.some((l) => l.kind === "branch" && l.name === trimmed)) {
    return refuse(
      `A branch named ${trimmed} already exists, and a branch points at exactly one commit.`,
    );
  }
  return run(`git branch ${shellQuote(trimmed)} ${commit.short}`);
}

function splitTarget(target: TargetId): [string, string | undefined] {
  const at = target.indexOf(":");
  return [target.slice(0, at), target.slice(at + 1)];
}

/** The command a drop stands for, or the reason it snaps back. */
export function dropOutcome(
  view: RepoView,
  carried: Carried,
  target: TargetId | null,
): Drop {
  if (target === null) return refuse("Not over a commit or a label.");
  return carried.kind === "head"
    ? dropHead(view, target)
    : dropLabel(view, carried.name, target);
}

/** How a target reads in announcements: a short ID or a branch name. */
export function targetName(view: RepoView, target: TargetId): string {
  const [kind, value = ""] = splitTarget(target);
  if (kind === "branch") return `the ${value} label`;
  const commit = view.commits.find((c) => c.oid === value);
  return commit ? `commit ${commit.short}, ${commit.subject}` : value;
}
