import { subjectOf } from "../commit/message";
import { walkCommits } from "../log/walk";
import { ancestorsOf } from "../merge/base";
import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import { branchRef, shortRefName } from "../refs/names";
import type { Oid, Repo, RepoPath, Signature, World } from "../types";
import { repoOf } from "../world/access";
import { HUB_ORIGIN } from "../world/network";
import { diffCommits, type FileDiffView } from "./diff";
import { hostedRepo } from "./state";

export type BranchView = {
  readonly name: string;
  readonly oid: Oid;
  readonly isDefault: boolean;
  /** Commits on this branch the default branch lacks, and the reverse. */
  readonly ahead: number;
  readonly behind: number;
};

export type CommitView = {
  readonly oid: Oid;
  readonly subject: string;
  readonly author: Signature;
};

export type TreeEntryView = {
  readonly name: string;
  readonly path: string;
  readonly kind: "file" | "dir";
};

export type TreeView = {
  readonly oid: Oid;
  readonly entries: readonly TreeEntryView[];
  readonly readme: { readonly path: string; readonly content: string } | null;
};

export type CommitPageView = {
  readonly oid: Oid;
  readonly message: string;
  readonly author: Signature;
  readonly committer: Signature;
  readonly parents: readonly Oid[];
  readonly files: readonly FileDiffView[];
};

const bareOf = (world: World, fullName: string): Repo =>
  repoOf(world, hostedRepo(world, fullName).repo);

/** The address `git clone` and `git remote add` take. */
export const cloneUrl = (fullName: string) => `${HUB_ORIGIN}${fullName}.git`;

/** The default branch (what the bare repository's HEAD names). */
export function defaultBranch(world: World, fullName: string): string {
  const { head } = bareOf(world, fullName);
  return head.kind === "symbolic" ? shortRefName(head.ref) : "main";
}

/** A branch name or a full commit ID the repository has, as a commit; else null. */
export function resolveHubRevision(
  world: World,
  fullName: string,
  revision: string,
): Oid | null {
  const repo = bareOf(world, fullName);
  const tip = repo.refs.get(branchRef(revision));
  if (tip) return tip;
  const oid = revision as Oid;
  return world.available.get(repo.id)?.has(oid) &&
    world.objects.get(oid)?.type === "commit"
    ? oid
    : null;
}

/** Branches, the default first, then by name. */
export function hubBranches(world: World, fullName: string): BranchView[] {
  const repo = bareOf(world, fullName);
  const main = defaultBranch(world, fullName);
  const mainTip = repo.refs.get(branchRef(main));
  const mainSet = mainTip
    ? ancestorsOf(world.objects, mainTip)
    : new Set<Oid>();
  const out: BranchView[] = [];
  for (const [ref, oid] of repo.refs) {
    if (!ref.startsWith("refs/heads/")) continue;
    const name = shortRefName(ref);
    const mine = ancestorsOf(world.objects, oid);
    out.push({
      name,
      oid,
      isDefault: name === main,
      ahead: [...mine].filter((c) => !mainSet.has(c)).length,
      behind: [...mainSet].filter((c) => !mine.has(c)).length,
    });
  }
  return out.sort(
    (a, b) =>
      Number(b.isDefault) - Number(a.isDefault) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
}

/** The history behind a commit, newest first (as the repository received it). */
export function hubCommits(
  world: World,
  fullName: string,
  tip: Oid,
): CommitView[] {
  const repo = bareOf(world, fullName);
  return walkCommits(world.objects, [tip], repo.arrival).map(
    ({ oid, commit }) => ({
      oid,
      subject: subjectOf(commit.message),
      author: commit.author,
    }),
  );
}

const README = /^readme(\.md|\.markdown|\.txt)?$/i;

/** One folder of a commit's snapshot (`dir` = "" for the root), folders first, with its README. */
export function hubTree(world: World, commit: Oid, dir = ""): TreeView {
  const files = flattenTree(
    world.objects,
    readObject(world.objects, commit, "commit").tree,
  );
  const prefix = dir ? `${dir}/` : "";
  const entries = new Map<string, TreeEntryView>();
  for (const path of files.keys()) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    const cut = rest.indexOf("/");
    const name = cut < 0 ? rest : rest.slice(0, cut);
    if (!entries.has(name)) {
      entries.set(name, {
        name,
        path: `${prefix}${name}`,
        kind: cut < 0 ? "file" : "dir",
      });
    }
  }
  const sorted = [...entries.values()].sort(
    (a, b) =>
      Number(b.kind === "dir") - Number(a.kind === "dir") ||
      (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1),
  );
  const readme = sorted.find((e) => e.kind === "file" && README.test(e.name));
  return {
    oid: commit,
    entries: sorted,
    readme: readme
      ? {
          path: readme.path,
          content: hubFile(world, commit, readme.path) ?? "",
        }
      : null,
  };
}

/** A file's content in a commit's snapshot, or null when the commit has no such file. */
export function hubFile(
  world: World,
  commit: Oid,
  path: string,
): string | null {
  const files = flattenTree(
    world.objects,
    readObject(world.objects, commit, "commit").tree,
  );
  const file = files.get(path as RepoPath);
  return file ? readObject(world.objects, file.oid, "blob").content : null;
}

/** A commit with its message and what it changed against its first parent. */
export function hubCommitPage(world: World, oid: Oid): CommitPageView {
  const commit = readObject(world.objects, oid, "commit");
  return {
    oid,
    message: commit.message,
    author: commit.author,
    committer: commit.committer,
    parents: commit.parents,
    files: diffCommits(world.objects, commit.parents[0] ?? null, oid),
  };
}
