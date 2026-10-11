import type { Oid, PathState, TargetSpec } from "@/engine";
import type {
  CommitView,
  LabelView,
  RepoView,
} from "@/features/graph/view-model";

type Commits = NonNullable<TargetSpec["commits"]>;

/** Commit variables with parents before children. */
function ordered(commits: Commits): string[] {
  const out: string[] = [];
  const visit = (id: string) => {
    if (out.includes(id) || !commits[id]) return;
    for (const parent of commits[id].parents ?? []) visit(parent);
    out.push(id);
  };
  for (const id of Object.keys(commits)) visit(id);
  return out;
}

const nameOf = (commits: Commits, id: string) => commits[id]?.name ?? id;

/** The target drawn as a ghost graph: variables stand in for commit IDs. */
export function targetView(target: TargetSpec): RepoView | null {
  const commits = target.commits;
  if (!commits) return null;
  const oid = (id: string) => `target:${id}` as Oid;
  const views = ordered(commits).map((id): CommitView => ({
    oid: oid(id),
    short: "?",
    subject: commits[id]?.message ?? nameOf(commits, id),
    parents: (commits[id]?.parents ?? []).map(oid),
    ghost: 1,
  }));
  const labels = Object.entries(target.branches ?? {}).flatMap(
    ([name, id]): LabelView[] =>
      id
        ? [{ ref: `refs/heads/${name}`, name, kind: "branch", target: oid(id) }]
        : [],
  );
  const head = target.head;
  if (head && "detached" in head)
    return {
      id: "target" as RepoView["id"],
      commits: views,
      labels,
      head: { kind: "detached", target: oid(head.detached) },
    };
  const on = head ? target.branches?.[head.branch] : null;
  return {
    id: "target" as RepoView["id"],
    commits: views,
    labels,
    head: {
      kind: "branch",
      branch: head?.branch ?? "",
      target: on ? oid(on) : null,
    },
  };
}

const STATES: Record<PathState, string> = {
  unmodified: "committed and unchanged",
  staged: "staged",
  modified: "modified, not staged",
  "staged-and-modified": "staged, then modified again",
  untracked: "untracked",
  ignored: "ignored by .gitignore",
  absent: "gone",
};

const list = (items: readonly string[]) =>
  items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** The target in plain sentences, for the text alternative to the ghost graph. */
export function describeTarget(target: TargetSpec): string[] {
  const out: string[] = [];
  const commits = target.commits ?? {};
  for (const id of ordered(commits)) {
    const commit = commits[id];
    const parents = (commit?.parents ?? []).map((p) => nameOf(commits, p));
    const files = Object.entries(commit?.files ?? {});
    const kept = files.filter(([, f]) => f !== null).map(([p]) => p);
    const gone = files.filter(([, f]) => f === null).map(([p]) => p);
    out.push(
      `A commit, ${nameOf(commits, id)}, ` +
        (parents.length ? `on top of ${list(parents)}` : "with no parent") +
        (kept.length ? `, containing ${list(kept)}` : "") +
        (gone.length ? `, without ${list(gone)}` : "") +
        ".",
    );
  }
  for (const [branch, id] of Object.entries(target.branches ?? {}))
    out.push(
      id
        ? `${branch} points to ${nameOf(commits, id)}.`
        : `There is no branch called ${branch}.`,
    );
  if (target.head)
    out.push(
      "branch" in target.head
        ? `HEAD is on ${target.head.branch}.`
        : `HEAD is detached at ${nameOf(commits, target.head.detached)}.`,
    );
  for (const [path, state] of Object.entries(target.paths ?? {}))
    out.push(`${path} is ${STATES[state]}.`);
  for (const [path, file] of Object.entries(target.worktree ?? {}))
    out.push(file === null ? `${path} is gone.` : `${path} is in the folder.`);
  for (const [key, value] of Object.entries(target.config ?? {}))
    out.push(value === null ? `${key} is not set.` : `${key} is ${value}.`);
  if (target.clean) out.push("Nothing is left to commit.");
  return out;
}
