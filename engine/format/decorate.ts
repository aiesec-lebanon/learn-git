import { shortRefName } from "../refs/names";
import { resolveHead } from "../refs/refs";
import type { Oid, Repo } from "../types";
import { compareBytes } from "../util/compare";

/** Short decorations for a commit, as a terminal shows them: `HEAD -> main, topic`. */
export function decorations(repo: Repo, oid: Oid): string[] {
  const out: string[] = [];
  const headBranch = repo.head.kind === "symbolic" ? repo.head.ref : null;
  if (resolveHead(repo) === oid) {
    out.push(headBranch ? `HEAD -> ${shortRefName(headBranch)}` : "HEAD");
  }
  const refs = [...repo.refs]
    .filter(([ref, target]) => target === oid && ref !== headBranch)
    .map(([ref]) => ref)
    .sort(compareBytes);
  for (const ref of refs) {
    out.push(
      ref.startsWith("refs/tags/")
        ? `tag: ${shortRefName(ref)}`
        : shortRefName(ref),
    );
  }
  return out;
}
