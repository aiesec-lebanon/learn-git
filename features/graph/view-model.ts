import {
  abbreviate,
  reachability,
  resolveHead,
  resolveUrl,
  shortRefName,
  subjectOf,
  trackingOf,
  type Commit,
  type Oid,
  type RefName,
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
  /** Small print under the label: `ahead 1 · behind 2`, `last contact 00:12 · origin moved since`. */
  readonly note?: string;
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

/** `00:12`: the simulated clock (UTC) at `time`. */
export const clockTime = (time: number) =>
  new Date(time * 1000).toISOString().slice(11, 16);

/**
 * When this repository last talked to the remote about `ref`: its newest
 * reflog entry, else the clone (Git logs no entry for refs a clone writes).
 */
export function lastContact(repo: Repo, ref: string): number | null {
  const own = repo.reflogs.get(ref)?.at(-1)?.who.time;
  if (own !== undefined) return own;
  const cloned = repo.reflogs
    .get("HEAD")
    ?.find((e) => e.message.startsWith("clone: "));
  return cloned?.who.time ?? null;
}

/** The remote name when its Hub copy of the branch is no longer where `ref` remembers it. */
function movedSince(world: World, repo: Repo, ref: RefName): string | null {
  const [, remote, branch] = /^refs\/remotes\/([^/]+)\/(.+)$/.exec(ref) ?? [];
  if (!remote || !branch) return null;
  const url = repo.config.find((e) => e.key === `remote.${remote}.url`)?.value;
  const hosted = url ? resolveUrl(world, url) : null;
  const now = hosted?.refs.get(`refs/heads/${branch}` as RefName);
  return now !== undefined && now !== repo.refs.get(ref) ? remote : null;
}

function labelNote(
  world: World,
  repo: Repo,
  ref: RefName,
  kind: LabelView["kind"],
): string | undefined {
  if (kind === "remote") {
    const time = lastContact(repo, ref);
    if (time === null) return undefined;
    const moved = movedSince(world, repo, ref);
    return `last contact ${clockTime(time)}${moved ? ` · ${moved} moved since` : ""}`;
  }
  if (kind !== "branch") return undefined;
  const machine = world.machines.get(repo.machine);
  const t = machine && trackingOf(world, machine, repo, ref);
  if (!t) return undefined;
  if (t.gone) return "upstream gone";
  const parts = [
    ...(t.ahead ? [`ahead ${t.ahead}`] : []),
    ...(t.behind ? [`behind ${t.behind}`] : []),
  ];
  return parts.length ? parts.join(" · ") : undefined;
}

export function repoView(world: World, repo: Repo): RepoView {
  const head = resolveHead(repo);
  const { live, logged } = reachability(world.objects, repo);
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
    if (!kind) continue;
    const note = repo.bare ? undefined : labelNote(world, repo, ref, kind);
    labels.push({
      ref,
      name: shortRefName(ref),
      kind,
      target,
      ...(note ? { note } : {}),
    });
  }
  return {
    id: repo.id,
    commits,
    labels,
    head:
      repo.head.kind === "detached"
        ? { kind: "detached", target: repo.head.oid }
        : {
            kind: "branch",
            branch: shortRefName(repo.head.ref),
            // A bare repository has no checkout, so no HEAD is drawn.
            target: repo.bare ? null : head,
          },
  };
}
