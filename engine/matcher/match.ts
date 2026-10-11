import { subjectOf } from "../commit/message";
import { canonicalKey } from "../config/keys";
import { configValue } from "../config/scopes";
import { resolvePath } from "../files/paths";
import { worktreeFiles } from "../files/worktree";
import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import { branchRef } from "../refs/names";
import { resolveHead } from "../refs/refs";
import { computeStatus } from "../status/compute";
import type { Commit, Oid, Repo, RepoPath, World } from "../types";
import { compareBytes } from "../util/compare";
import { machineOf } from "../world/access";
import { resolveUrl } from "../world/network";
import { report } from "./report";
import type {
  CommitTarget,
  FileExpectation,
  MatchReport,
  PathState,
  TargetSpec,
} from "./target";

const SEARCH_BUDGET = 10_000;

function findRepo(world: World, folder: string | undefined): Repo | null {
  const machine = machineOf(world);
  const repos = [...world.repos.values()].filter(
    (r) => r.machine === machine.id,
  );
  if (folder === undefined)
    return repos.length === 1 ? (repos[0] ?? null) : null;
  const workdir = resolvePath(machine.home, folder);
  return repos.find((r) => r.workdir === workdir) ?? null;
}

function reachable(world: World, repo: Repo): Map<Oid, Commit> {
  const head = resolveHead(repo);
  const stack = [...repo.refs.values(), ...(head ? [head] : [])];
  const out = new Map<Oid, Commit>();
  for (let oid = stack.pop(); oid; oid = stack.pop()) {
    if (out.has(oid)) continue;
    const commit = readObject(world.objects, oid, "commit");
    out.set(oid, commit);
    stack.push(...commit.parents);
  }
  return out;
}

function fileMatches(
  actual: string | undefined,
  want: FileExpectation,
): boolean {
  if (want === null) return actual === undefined;
  if (want === true) return actual !== undefined;
  return actual === want;
}

/** Checks a world against a declarative target (E9). */
export function match(world: World, target: TargetSpec): MatchReport {
  const repo = findRepo(world, target.repo);
  if (!repo) {
    return {
      ok: false,
      differences: [report.noRepository(target.repo ?? "this folder")],
      bindings: new Map(),
    };
  }
  const differences: string[] = [];
  const pool = world.objects;
  const commits = reachable(world, repo);
  const specs = target.commits ?? {};
  const nameOf = (v: string) => specs[v]?.name ?? `commit ${v}`;

  const snapshot = (commit: Commit) => flattenTree(pool, commit.tree);
  const contentAt = (commit: Commit, path: string) => {
    const file = snapshot(commit).get(path as RepoPath);
    return file ? readObject(pool, file.oid, "blob").content : undefined;
  };
  const ownProblems = (spec: CommitTarget, v: string, c: Commit) => {
    const out: string[] = [];
    for (const [path, want] of Object.entries(spec.files ?? {})) {
      if (!fileMatches(contentAt(c, path), want))
        out.push(report.commitFile(nameOf(v), path, want));
    }
    if (spec.message !== undefined && subjectOf(c.message) !== spec.message)
      out.push(report.message(nameOf(v), spec.message));
    if (spec.parents && spec.parents.length !== c.parents.length)
      out.push(
        report.parentCount(nameOf(v), spec.parents.length, c.parents.length),
      );
    return out;
  };

  // Anchors: branches and a detached HEAD bind variables directly.
  const bindings = new Map<string, Oid>();
  const bind = (v: string, oid: Oid) => {
    const bound = bindings.get(v);
    if (bound && bound !== oid) {
      differences.push(report.anchorConflict(nameOf(v)));
      return;
    }
    if (bound || !specs[v]) return;
    bindings.set(v, oid);
    const parents = specs[v].parents ?? [];
    const actual = commits.get(oid)?.parents ?? [];
    parents.forEach((p, i) => {
      const parent = actual[i];
      if (parent) bind(p, parent);
    });
  };
  for (const [branch, v] of Object.entries(target.branches ?? {})) {
    const oid = repo.refs.get(branchRef(branch));
    if (v === null) {
      if (oid) differences.push(report.branchExtra(branch));
    } else if (!oid) {
      differences.push(report.branchMissing(branch));
    } else bind(v, oid);
  }
  for (const [remote, branches] of Object.entries(target.remotes ?? {})) {
    const url = configValue(
      world,
      machineOf(world, repo.machine),
      repo,
      `remote.${remote}.url`,
    );
    const hosted = url ? resolveUrl(world, url) : null;
    for (const [branch, v] of Object.entries(branches)) {
      const oid = hosted?.refs.get(branchRef(branch));
      if (v === null) {
        if (oid) differences.push(report.remoteBranchExtra(remote, branch));
      } else if (!oid) {
        differences.push(report.remoteBranchMissing(remote, branch));
      } else bind(v, oid);
    }
  }
  if (target.head && "detached" in target.head) {
    if (repo.head.kind === "detached")
      bind(target.head.detached, repo.head.oid);
    else differences.push(report.headDetached(nameOf(target.head.detached)));
  } else if (target.head) {
    const ref = branchRef(target.head.branch);
    if (repo.head.kind !== "symbolic" || repo.head.ref !== ref)
      differences.push(report.headBranch(target.head.branch));
  }

  // Unanchored variables: a small backtracking search over unused commits.
  const free = Object.keys(specs).filter((v) => !bindings.has(v));
  const consistent = (v: string, oid: Oid, at: Map<string, Oid>) => {
    const commit = commits.get(oid);
    const spec = specs[v];
    if (!commit || !spec || ownProblems(spec, v, commit).length) return false;
    if ([...at.values()].includes(oid)) return false;
    const parentsOk = (spec.parents ?? []).every((p, i) => {
      const bound = at.get(p);
      return !bound || bound === commit.parents[i];
    });
    const childrenOk = Object.entries(specs).every(([w, s]) => {
      const i = s.parents?.indexOf(v) ?? -1;
      const child = at.get(w);
      return i < 0 || !child || commits.get(child)?.parents[i] === oid;
    });
    return parentsOk && childrenOk;
  };
  let budget = SEARCH_BUDGET;
  const search = (i: number, at: Map<string, Oid>): boolean => {
    const v = free[i];
    if (v === undefined) return true;
    for (const oid of commits.keys()) {
      if (--budget < 0) return false;
      if (!consistent(v, oid, at)) continue;
      at.set(v, oid);
      if (search(i + 1, at)) return true;
      at.delete(v);
    }
    return false;
  };
  const trial = new Map(bindings);
  if (free.length && search(0, trial)) {
    for (const v of free) bindings.set(v, trial.get(v) as Oid);
  }

  const seen = new Map<Oid, string>();
  for (const v of Object.keys(specs)) {
    const oid = bindings.get(v);
    const commit = oid ? commits.get(oid) : undefined;
    const spec = specs[v];
    if (!oid || !commit || !spec) {
      differences.push(report.noCommit(nameOf(v)));
      continue;
    }
    const other = seen.get(oid);
    if (other) differences.push(report.sameCommit(nameOf(other), nameOf(v)));
    seen.set(oid, v);
    differences.push(...ownProblems(spec, v, commit));
  }
  const want = Object.keys(specs).length;
  if (want && (target.exact ?? true) && commits.size !== want)
    differences.push(report.commitCount(want, commits.size));

  differences.push(...stateDifferences(world, repo, target));
  return { ok: differences.length === 0, differences, bindings };
}

function stateDifferences(
  world: World,
  repo: Repo,
  target: TargetSpec,
): string[] {
  const out: string[] = [];
  const machine = machineOf(world, repo.machine);
  const files = worktreeFiles(machine.fs, repo.workdir);
  const status = computeStatus(world.objects, repo, machine.fs);
  const staged = new Set<string>(status.staged.map((c) => c.path));
  const unstaged = new Set<string>(status.unstaged.map((c) => c.path));
  const untracked = new Set<string>(status.untracked);
  const ignored = new Set<string>(status.ignored);
  const stateOf = (path: string): PathState => {
    if (untracked.has(path)) return "untracked";
    if (ignored.has(path)) return "ignored";
    if (staged.has(path) && unstaged.has(path)) return "staged-and-modified";
    if (staged.has(path)) return "staged";
    if (unstaged.has(path)) return "modified";
    return repo.index.has(path as RepoPath) ? "unmodified" : "absent";
  };
  for (const [path, want] of Object.entries(target.paths ?? {})) {
    const got = stateOf(path);
    if (got !== want) out.push(report.pathState(path, want, got));
  }
  if (target.clean) {
    const dirty = [...new Set([...staged, ...unstaged, ...untracked])].sort(
      compareBytes,
    );
    if (dirty.length) out.push(report.notClean(dirty));
  }
  for (const [path, want] of Object.entries(target.worktree ?? {})) {
    if (!fileMatches(files.get(path as RepoPath), want))
      out.push(report.worktreeFile(path, want));
  }
  for (const [key, want] of Object.entries(target.config ?? {})) {
    const got =
      configValue(world, machine, repo, canonicalKey(key) ?? key) ?? null;
    if (got !== want) out.push(report.config(key, want));
  }
  return out;
}
