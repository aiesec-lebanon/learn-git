import {
  abbreviate,
  resolveHead,
  shortRefName,
  subjectOf,
  type Commit,
  type Oid,
  type Repo,
  type RepoId,
  type World,
} from "@/engine";

/** 0 reachable, 1 reachable only through the reflog, 2 unreachable. */
export type GhostLevel = 0 | 1 | 2;

export type CommitView = {
  readonly oid: Oid;
  readonly short: string;
  readonly subject: string;
  readonly parents: readonly Oid[];
  readonly ghost: GhostLevel;
};

export type LabelView = {
  /** The full ref name, e.g. `refs/heads/main`. */
  readonly ref: string;
  readonly name: string;
  readonly kind: "branch" | "remote" | "tag";
  readonly target: Oid;
};

export type HeadView =
  | {
      readonly kind: "branch";
      readonly branch: string;
      readonly target: Oid | null;
    }
  | { readonly kind: "detached"; readonly target: Oid };

/** Everything the graph shows about one repository; display data only. */
export type RepoView = {
  readonly id: RepoId;
  /** In arrival order (ADR-003 columns). */
  readonly commits: readonly CommitView[];
  readonly labels: readonly LabelView[];
  readonly head: HeadView;
};

const KINDS = [
  ["refs/heads/", "branch"],
  ["refs/remotes/", "remote"],
  ["refs/tags/", "tag"],
] as const;

function reach(world: World, starts: Iterable<Oid>): Set<Oid> {
  const seen = new Set<Oid>();
  const stack = [...starts];
  for (let oid = stack.pop(); oid; oid = stack.pop()) {
    if (seen.has(oid)) continue;
    const commit = world.objects.get(oid);
    if (commit?.type !== "commit") continue;
    seen.add(oid);
    stack.push(...commit.parents);
  }
  return seen;
}

export function repoView(world: World, repo: Repo): RepoView {
  const head = resolveHead(repo);
  const live = reach(world, [...repo.refs.values(), ...(head ? [head] : [])]);
  const logged = reach(
    world,
    [...repo.reflogs.values()].flatMap((log) =>
      log.flatMap((e) => [e.old, e.new]).filter((o): o is Oid => o !== null),
    ),
  );
  const commits = repo.arrival.map((oid): CommitView => {
    const commit = world.objects.get(oid) as Commit;
    return {
      oid,
      short: abbreviate(world.objects, oid),
      subject: subjectOf(commit.message),
      parents: commit.parents,
      ghost: live.has(oid) ? 0 : logged.has(oid) ? 1 : 2,
    };
  });
  const labels: LabelView[] = [];
  for (const [ref, target] of repo.refs) {
    const kind = KINDS.find(([prefix]) => ref.startsWith(prefix))?.[1];
    if (kind) labels.push({ ref, name: shortRefName(ref), kind, target });
  }
  return {
    id: repo.id,
    commits,
    labels,
    head:
      repo.head.kind === "detached"
        ? { kind: "detached", target: repo.head.oid }
        : { kind: "branch", branch: shortRefName(repo.head.ref), target: head },
  };
}
