import {
  leftBehind,
  reachableFrom,
  resolveHead,
  type Oid,
  type World,
} from "@/engine";
import type { RepoView } from "./view-model";

/** Highlighted commits: reachable from a label, or about to become unreachable. */
export type Highlight = {
  readonly oids: ReadonlySet<Oid>;
  readonly kind: "reach" | "lost";
};

const repoOf = (world: World, view: RepoView) => world.repos.get(view.id);

/** Commits newest first, as the previews list them. */
const newestFirst = (view: RepoView, oids: ReadonlySet<Oid>) =>
  [...view.commits].reverse().filter((c) => oids.has(c.oid));

/** Every commit a branch label (or `HEAD`) reaches. */
export function reachedFrom(world: World, view: RepoView, name: string) {
  const target =
    name === "HEAD"
      ? view.head.target
      : view.labels.find((l) => l.name === name)?.target;
  const oids = reachableFrom(world.objects, target ? [target] : []);
  return newestFirst(view, oids);
}

/** Commits only `branch` reaches: what `git branch -D` would leave unreachable. */
export function lostIfDeleted(world: World, view: RepoView, branch: string) {
  const repo = repoOf(world, view);
  const ref = `refs/heads/${branch}`;
  const tip = view.labels.find((l) => l.ref === ref)?.target;
  if (!repo || !tip) return [];
  const head = resolveHead(repo);
  const others = [...repo.refs]
    .filter(([name]) => name !== ref)
    .map(([, oid]) => oid);
  const kept = reachableFrom(world.objects, [
    ...others,
    ...(head ? [head] : []),
  ]);
  const lost = reachableFrom(world.objects, [tip]);
  return newestFirst(view, new Set([...lost].filter((o) => !kept.has(o))));
}

/** Commits a detached HEAD alone reaches: what leaving it now would leave behind. */
export function lostIfLeaving(world: World, view: RepoView) {
  const repo = repoOf(world, view);
  if (!repo || view.head.kind !== "detached") return [];
  return newestFirst(
    view,
    new Set(leftBehind(world.objects, repo, view.head.target, null)),
  );
}
