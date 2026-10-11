import { shortRefName } from "../refs/names";
import { allRefs, resolveHead } from "../refs/refs";
import type { Oid, Repo } from "../types";
import { compareBytes } from "../util/compare";

/**
 * Short decorations for a commit, as a terminal shows them: `HEAD -> main`
 * first, then the other refs in reverse ref order (as Git lists them).
 */
export function decorations(repo: Repo, oid: Oid): string[] {
  const out: string[] = [];
  const headBranch = repo.head.kind === "symbolic" ? repo.head.ref : null;
  if (resolveHead(repo) === oid) {
    out.push(headBranch ? `HEAD -> ${shortRefName(headBranch)}` : "HEAD");
  }
  const refs = [...allRefs(repo)]
    .filter(([ref, target]) => target === oid && ref !== headBranch)
    .map(([ref]) => ref)
    .sort(compareBytes)
    .reverse();
  for (const ref of refs) {
    out.push(
      ref.startsWith("refs/tags/")
        ? `tag: ${shortRefName(ref)}`
        : shortRefName(ref),
    );
  }
  return out;
}
