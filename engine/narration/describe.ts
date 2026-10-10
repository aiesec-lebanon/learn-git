import { subjectOf } from "../commit/message";
import { walkCommits } from "../log/walk";
import { abbreviate } from "../objects/abbrev";
import { shortRefName } from "../refs/names";
import { resolveHead } from "../refs/refs";
import type { Oid, RepoId, World } from "../types";
import { compareBytes } from "../util/compare";
import { repoOf } from "../world/access";

/** "Describe this graph": a short spoken summary of one repository's history. */
export function describeGraph(world: World, repoId: RepoId): string {
  const repo = repoOf(world, repoId);
  const head = resolveHead(repo);
  const starts = [...new Set([...repo.refs.values(), ...(head ? [head] : [])])];
  const commits = walkCommits(world.objects, starts, repo.arrival);
  const name = (oid: Oid) => {
    const commit = commits.find((c) => c.oid === oid)?.commit;
    const subject = commit ? ` "${subjectOf(commit.message)}"` : "";
    return `${abbreviate(world.objects, oid)}${subject}`;
  };
  const headText =
    repo.head.kind === "detached"
      ? `HEAD is detached at ${name(repo.head.oid)}.`
      : head
        ? `HEAD points at ${shortRefName(repo.head.ref)}, at ${name(head)}.`
        : `HEAD points at ${shortRefName(repo.head.ref)}, which has no commits yet.`;
  if (!commits.length) return `No commits yet. ${headText}`;

  const merges = commits.filter((c) => c.commit.parents.length > 1).length;
  const refs = [...repo.refs]
    .sort(([a], [b]) => compareBytes(a, b))
    .map(
      ([ref, oid]) =>
        `${shortRefName(ref)} at ${abbreviate(world.objects, oid)}`,
    );
  const oldest = commits.at(-1);
  return [
    `${commits.length} commit${commits.length === 1 ? "" : "s"}${merges ? `, ${merges} of them merges` : ""}.`,
    headText,
    `Branches: ${refs.join(", ")}.`,
    oldest && commits.length > 1 ? `The oldest is ${name(oldest.oid)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
