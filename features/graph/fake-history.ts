import type { Oid } from "@/engine";
import type { CommitView, RepoView } from "./view-model";

/** A synthetic repository view for layout tests: `parents[i]` lists earlier indexes. */
export function fakeView(parents: readonly (readonly number[])[]): RepoView {
  const oid = (i: number) => i.toString(16).padStart(40, "0") as Oid;
  const commits = parents.map((ps, i): CommitView => ({
    oid: oid(i),
    short: oid(i).slice(-7),
    subject: `c${i}`,
    parents: ps.map(oid),
    ghost: 0,
  }));
  const last = commits.at(-1)?.oid ?? null;
  return {
    id: "fake",
    commits,
    labels: last
      ? [{ ref: "refs/heads/main", name: "main", kind: "branch", target: last }]
      : [],
    head: { kind: "branch", branch: "main", target: last },
  };
}
