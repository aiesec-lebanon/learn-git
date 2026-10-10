import {
  computeStatus,
  discoverRepo,
  machineOf,
  worktreeFiles,
  type RepoPath,
  type World,
} from "@/engine";

export type FileState =
  "unmodified" | "untracked" | "modified" | "added" | "deleted" | "conflict";

export type FileCard = {
  readonly path: string;
  readonly state: FileState | null;
};

export type StageFiles = {
  /** The repository's folder, or the current folder when there is none. */
  readonly root: string;
  readonly repo: string | null;
  readonly worktree: readonly FileCard[];
  /** Null before `git init`: there is no staging area yet. */
  readonly index: readonly FileCard[] | null;
};

const byPath = (a: FileCard, b: FileCard) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

/** What the working tree and staging area areas show for the current folder. */
export function stageFiles(world: World): StageFiles {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  if (!repo) {
    const files = worktreeFiles(machine.fs, machine.cwd);
    return {
      root: machine.cwd,
      repo: null,
      worktree: [...files.keys()]
        .map((path) => ({ path, state: null }))
        .sort(byPath),
      index: null,
    };
  }
  const status = computeStatus(world.objects, repo, machine.fs);
  const files = worktreeFiles(machine.fs, repo.workdir);
  const conflicted = new Set<string>(
    [...repo.index]
      .filter(([, e]) => e.some((x) => x.stage > 0))
      .map(([p]) => p),
  );
  const unstaged = new Map<string, string>(
    status.unstaged.map((c) => [c.path, c.kind]),
  );
  const staged = new Map<string, string>(
    status.staged.map((c) => [c.path, c.kind]),
  );
  const untracked = new Set<string>(status.untracked);

  const worktree: FileCard[] = [...files.keys()].map((path) => ({
    path,
    state: conflicted.has(path)
      ? "conflict"
      : untracked.has(path)
        ? "untracked"
        : unstaged.has(path)
          ? "modified"
          : "unmodified",
  }));
  for (const [path, kind] of unstaged) {
    if (kind === "deleted") worktree.push({ path, state: "deleted" });
  }
  const index: FileCard[] = [...repo.index.keys()].map((path: RepoPath) => {
    const kind = staged.get(path);
    return {
      path,
      state: conflicted.has(path)
        ? "conflict"
        : kind === "added"
          ? "added"
          : kind === "modified"
            ? "modified"
            : "unmodified",
    };
  });
  for (const [path, kind] of staged) {
    if (kind === "deleted") index.push({ path, state: "deleted" });
  }
  return {
    root: repo.workdir,
    repo: repo.id,
    worktree: worktree.sort(byPath),
    index: index.sort(byPath),
  };
}
