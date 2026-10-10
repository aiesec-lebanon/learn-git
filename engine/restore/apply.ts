import { refuse, type CommandResult } from "../commands/registry";
import { resolvePath } from "../files/paths";
import { removeFile, worktreeFiles, writeFile } from "../files/worktree";
import { readObject } from "../objects/pool";
import { flattenTree, type TreeFile } from "../objects/tree";
import { matchesPathspec, type Pathspec } from "../pathspec";
import { stageEntry, stagedFiles, unstagePath } from "../staging/index";
import type {
  Effect,
  Machine,
  Oid,
  PathChange,
  Repo,
  RepoPath,
  World,
} from "../types";
import { compareBytes } from "../util/compare";
import { withMachine, withRepo } from "../world/access";

export type RestorePlan = {
  /** Where content comes from; null means the index (worktree restores only). */
  readonly source: ReadonlyMap<RepoPath, TreeFile> | null;
  readonly staged: boolean;
  readonly worktree: boolean;
  /** Overlay mode (legacy `checkout`) never deletes paths missing from the source. */
  readonly overlay: boolean;
  /** Unmatched pathspecs are an error (restore, checkout) or ignored (reset). */
  readonly strict: boolean;
  readonly specs: readonly Pathspec[];
};

const unmatchedError = (specs: readonly Pathspec[]) =>
  refuse(
    "pathspec-no-match",
    specs
      .map(
        (s) =>
          `error: pathspec '${s.original}' did not match any file(s) known to git\n`,
      )
      .join(""),
    1,
  );

/**
 * Copies content between the zones for the matching paths: into the
 * index and/or the working tree, from a commit's tree or the index.
 */
export function applyRestore(
  world: World,
  repo: Repo,
  machine: Machine,
  plan: RestorePlan,
): CommandResult {
  const index = stagedFiles(repo.index);
  const source = plan.source ?? index;
  const known = [...new Set([...index.keys(), ...source.keys()])].sort(
    compareBytes,
  );
  const matches = (path: RepoPath) =>
    plan.specs.some((s) => matchesPathspec(s, path));
  const unmatched = plan.specs.filter(
    (s) => !known.some((p) => matchesPathspec(s, p)),
  );
  if (plan.strict && unmatched.length) return unmatchedError(unmatched);
  const paths = known.filter(matches);
  const effects: Effect[] = [];
  let nextIndex = repo.index;
  if (plan.staged) {
    const changes: PathChange[] = [];
    for (const path of paths) {
      const from = source.get(path);
      const now = index.get(path);
      if (from) {
        if (now?.oid === from.oid && now.mode === from.mode) continue;
        nextIndex = stageEntry(nextIndex, { path, ...from, stage: 0 });
        changes.push({ path, change: now ? "modified" : "added" });
      } else if (now && !plan.overlay) {
        nextIndex = unstagePath(nextIndex, path);
        changes.push({ path, change: "deleted" });
      }
    }
    if (changes.length)
      effects.push({
        kind: "index-changed",
        repo: repo.id,
        from: "commit",
        changes,
      });
  }
  let fs = machine.fs;
  if (plan.worktree) {
    const files = worktreeFiles(fs, repo.workdir);
    const changes: (PathChange & { node: "file" })[] = [];
    for (const path of paths) {
      const from = source.get(path);
      const absolute = resolvePath(repo.workdir, path);
      const current = files.get(path);
      if (from) {
        const content = readObject(world.objects, from.oid, "blob").content;
        if (current === content) continue;
        fs = writeFile(fs, absolute, content);
        changes.push({
          path: absolute,
          change: current === undefined ? "added" : "modified",
          node: "file",
        });
      } else if (current !== undefined && !plan.overlay) {
        fs = removeFile(fs, absolute);
        changes.push({ path: absolute, change: "deleted", node: "file" });
      }
    }
    if (changes.length)
      effects.push({ kind: "files-changed", machine: machine.id, changes });
  }
  const next = withRepo(world, { ...repo, index: nextIndex });
  return {
    world: fs === machine.fs ? next : withMachine(next, { ...machine, fs }),
    effects,
  };
}

/** The files of a commit or tree, or null for any other object. */
export function sourceFiles(
  world: World,
  oid: Oid,
): ReadonlyMap<RepoPath, TreeFile> | null {
  const object = world.objects.get(oid);
  if (object?.type === "commit") return flattenTree(world.objects, object.tree);
  if (object?.type === "tree") return flattenTree(world.objects, oid);
  return null;
}
