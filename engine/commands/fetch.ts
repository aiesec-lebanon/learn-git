import { flag, type OptionSpec } from "../cli/options";
import { reflogWho } from "../config/identity";
import { remoteNames, remoteUrl } from "../config/remotes";
import { configValue } from "../config/scopes";
import {
  rangeSummary,
  refUpdateLine,
  type RefUpdate,
} from "../format/ref-updates";
import { notSimulated } from "../messages/git";
import { displayUrl, FETCH_USAGE, fetchMessages as m } from "../messages/fetch";
import { networkMessages as net } from "../messages/remote";
import { isAncestor } from "../reachability";
import { branchRef, shortRefName } from "../refs/names";
import { headBranch, updateRef } from "../refs/refs";
import type { Effect, Machine, Oid, RefName, Repo, World } from "../types";
import { compareBytes } from "../util/compare";
import { repoOf, withRepo } from "../world/access";
import { connect, transfer } from "../world/network";
import { defineCommand, refuse, type CommandResult } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

export type FetchRequest = {
  readonly world: World;
  readonly machine: Machine;
  readonly repo: Repo;
  readonly time: number;
  readonly remote: string;
  /** Branches named on the command line; `FETCH_HEAD` then holds only these. */
  readonly branches: readonly string[];
  readonly prune: boolean;
  readonly quiet: boolean;
  /** What the reflog entries start with, e.g. `fetch origin`. */
  readonly action: string;
};

export type Fetched =
  | {
      readonly ok: true;
      readonly world: World;
      readonly stderr: string;
      readonly effects: readonly Effect[];
    }
  | { readonly ok: false; readonly result: CommandResult };

const MIN_WIDTH = 10;

/** The local branch's remote, else `origin`. */
export function defaultRemote(
  world: World,
  machine: Machine,
  repo: Repo,
): string {
  const branch = headBranch(repo);
  const configured =
    branch &&
    configValue(world, machine, repo, `branch.${shortRefName(branch)}.remote`);
  return configured || "origin";
}

/** The branch on `remote` the current branch merges from, or null. */
function mergeBranch(
  world: World,
  machine: Machine,
  repo: Repo,
  remote: string,
): string | null {
  const branch = headBranch(repo);
  if (!branch || defaultRemote(world, machine, repo) !== remote) return null;
  const name = shortRefName(branch);
  const merge = configValue(world, machine, repo, `branch.${name}.merge`);
  return merge ? shortRefName(merge) : null;
}

/** `FETCH_HEAD` lines: the branches to merge first, the others marked not-for-merge. */
function fetchHeadText(
  heads: readonly (readonly [string, Oid])[],
  merge: ReadonlySet<string>,
  url: string,
): string {
  const line = (name: string, oid: Oid, tag: string) =>
    `${oid}\t${tag}\tbranch '${name}' of ${url}\n`;
  return [
    ...heads.filter(([n]) => merge.has(n)).map(([n, o]) => line(n, o, "")),
    ...heads
      .filter(([n]) => !merge.has(n))
      .map(([n, o]) => line(n, o, "not-for-merge")),
  ].join("");
}

/**
 * Fetches from one remote: transfers missing objects, updates (and with
 * `prune` deletes) remote-tracking branches, writes `FETCH_HEAD` and
 * prints Git's ref-update lines.
 */
export function fetchRemote(req: FetchRequest): Fetched {
  const { world, machine, time, remote, branches } = req;
  const url = remoteUrl(world, machine, req.repo, remote);
  if (url === null) {
    return {
      ok: false,
      result: refuse("no-remote", net.notARepository(remote)),
    };
  }
  const reached = connect(world, url, remote);
  if (!reached.ok) {
    return { ok: false, result: refuse("no-remote", reached.stderr) };
  }
  if (branches.some((b) => b.includes(":"))) {
    return {
      ok: false,
      result: refuse(
        "not-simulated",
        notSimulated("fetch refspecs with ':'"),
        1,
      ),
    };
  }
  const source = reached.repo;
  const shown = displayUrl(url);
  const heads = [...source.refs]
    .filter(([ref]) => ref.startsWith("refs/heads/"))
    .map(([ref, oid]) => [shortRefName(ref), oid] as const)
    .sort((a, b) => compareBytes(a[0], b[0]));
  const missing = branches.find((b) => !source.refs.has(branchRef(b)));
  if (missing !== undefined) {
    return {
      ok: false,
      result: {
        ...refuse("unknown-revision", m.noRemoteRef(missing)),
        world: withRepo(world, { ...req.repo, fetchHead: "" }),
      },
    };
  }
  const upstream = branches.length
    ? null
    : mergeBranch(world, machine, req.repo, remote);
  const wanted = branches.length
    ? [...new Set(branches)].map(
        (b) => [b, source.refs.get(branchRef(b)) as Oid] as const,
      )
    : [
        ...heads.filter(([name]) => name === upstream),
        ...heads.filter(([name]) => name !== upstream),
      ];
  const sent = transfer(
    world,
    source.id,
    req.repo.id,
    wanted.map(([, oid]) => oid),
    "fetch",
  );
  let next = sent.world;
  let repo = repoOf(next, req.repo.id);
  const effects: Effect[] = [...sent.effects];
  const who = reflogWho(next, machine, repo, time);
  const prefix = `refs/remotes/${remote}/`;
  const pruned: RefUpdate[] = [];
  if (req.prune && !branches.length) {
    const alive = new Set(heads.map(([name]) => `${prefix}${name}`));
    for (const ref of [...repo.refs.keys()].sort(compareBytes)) {
      if (!ref.startsWith(prefix) || alive.has(ref)) continue;
      const deleted = updateRef(repo, ref, null, who, "");
      repo = deleted.repo;
      effects.push(deleted.effect);
      pruned.push({
        code: "-",
        summary: "[deleted]",
        from: "(none)",
        to: shortRefName(ref),
      });
    }
  }
  const updates: RefUpdate[] = [];
  for (const [name, oid] of wanted) {
    const ref = `${prefix}${name}` as RefName;
    const old = repo.refs.get(ref);
    if (old === oid) continue;
    const forced = old !== undefined && !isAncestor(next.objects, old, oid);
    const kind = !old
      ? "storing head"
      : forced
        ? "forced-update"
        : "fast-forward";
    const moved = updateRef(repo, ref, oid, who, `${req.action}: ${kind}`);
    repo = moved.repo;
    effects.push(moved.effect);
    updates.push(
      !old
        ? {
            code: "*",
            summary: "[new branch]",
            from: name,
            to: shortRefName(ref),
          }
        : {
            code: forced ? "+" : " ",
            summary: rangeSummary(next.objects, old, oid, forced),
            from: name,
            to: shortRefName(ref),
            ...(forced ? { suffix: "  (forced update)" } : {}),
          },
    );
  }
  const merge = new Set(
    branches.length ? branches : upstream ? [upstream] : [],
  );
  repo = { ...repo, fetchHead: fetchHeadText(wanted, merge, shown) };
  next = withRepo(next, repo);
  const explicit: RefUpdate[] = branches.map((name) => ({
    code: "*",
    summary: "branch",
    from: name,
    to: "FETCH_HEAD",
  }));
  const width = Math.max(MIN_WIDTH, ...updates.map((u) => u.from.length));
  const lines = [...pruned, ...explicit, ...updates];
  const stderr =
    req.quiet || !lines.length
      ? ""
      : m.from(shown) + lines.map((u) => refUpdateLine(u, width)).join("");
  return { ok: true, world: next, stderr, effects };
}

const OPTIONS: readonly OptionSpec[] = [
  { key: "all", long: "all" },
  { key: "prune", short: "p", long: "prune" },
  { key: "quiet", short: "q", long: "quiet" },
  x("verbose", "v"),
  x("append", "a"),
  x("atomic"),
  x("depth", undefined, "required"),
  x("deepen", undefined, "required"),
  x("dry-run", "n"),
  x("force", "f"),
  x("multiple"),
  x("tags", "t"),
  x("prune-tags", "P"),
  x("set-upstream"),
  x("unshallow"),
  x("jobs", "j", "required"),
  x("refetch"),
  x("recurse-submodules", undefined, "optional"),
  x("progress"),
];

export const fetch = defineCommand({
  name: "fetch",
  counted: true,
  needsRepo: true,
  usage: FETCH_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const { machine, options, time } = ctx;
    const unsupported = refuseUnsimulated("fetch", options);
    if (unsupported) return unsupported;
    const [named, ...branches] = options.args;
    const all = flag(options, "all");
    if (all && named !== undefined) {
      return refuse("usage", m.allTakesNoRepository());
    }
    let world = ctx.world;
    const remotes = all
      ? remoteNames(ctx.repo)
      : [named ?? defaultRemote(world, machine, ctx.repo)];
    if (named === undefined && !remoteNames(ctx.repo).length) return {};
    const action = ["fetch", ...(ctx.argv ?? [])].join(" ");
    let stdout = "";
    let stderr = "";
    const effects: Effect[] = [];
    for (const remote of remotes) {
      if (remotes.length > 1 && !flag(options, "quiet")) {
        stdout += m.fetching(remote);
      }
      const fetched = fetchRemote({
        world,
        machine,
        repo: repoOf(world, ctx.repo.id),
        time,
        remote,
        branches,
        prune: flag(options, "prune"),
        quiet: flag(options, "quiet"),
        action,
      });
      if (!fetched.ok) {
        const { result } = fetched;
        return {
          ...result,
          world: result.world ?? world,
          stdout,
          stderr: stderr + (result.stderr ?? ""),
          effects: [...effects, ...(result.effects ?? [])],
        };
      }
      world = fetched.world;
      stderr += fetched.stderr;
      effects.push(...fetched.effects);
    }
    return { world, stdout, stderr, effects };
  },
});
