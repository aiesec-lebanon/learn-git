import type { Oid } from "@/engine";
import type { CommitView, LabelView, RepoView } from "./view-model";

/** One part of an accessible name; `isolate` parts are learner text (`<bdi>`). */
export type NamePart = { readonly text: string; readonly isolate: boolean };

const GHOST = ["", "only in the reflog", "unreachable"] as const;

export function labelsAt(view: RepoView, oid: Oid): readonly LabelView[] {
  return view.labels.filter((l) => l.target === oid);
}

export function headAt(view: RepoView, oid: Oid): boolean {
  return view.head.target === oid;
}

/** "3f2a1bc, Add footer, parent 9c1d2e3, main, HEAD" as parts. */
export function commitNameParts(
  commit: CommitView,
  view: RepoView,
): readonly NamePart[] {
  const short = (oid: Oid) =>
    view.commits.find((c) => c.oid === oid)?.short ?? oid.slice(0, 7);
  const plain = (text: string) => ({ text, isolate: false });
  const parents = commit.parents.map(short);
  const parts: NamePart[] = [
    plain(commit.short),
    { text: commit.subject, isolate: true },
    plain(
      parents.length === 0
        ? "first commit"
        : parents.length === 1
          ? `parent ${parents[0]}`
          : `parents ${parents.join(" and ")}`,
    ),
    ...labelsAt(view, commit.oid).map((l) => ({
      text: l.kind === "tag" ? `tag ${l.name}` : l.name,
      isolate: true,
    })),
  ];
  if (headAt(view, commit.oid))
    parts.push(plain(view.head.kind === "detached" ? "detached HEAD" : "HEAD"));
  if (commit.ghost) parts.push(plain(GHOST[commit.ghost]));
  return parts;
}

export function commitName(commit: CommitView, view: RepoView): string {
  return commitNameParts(commit, view)
    .map((p) => p.text)
    .join(", ");
}
