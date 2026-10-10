import { computeStatus, discoverRepo, machineOf, type World } from "@/engine";

export type Zone = "worktree" | "index" | "head";

export type LensSection = {
  readonly id: "staged" | "unstaged" | "untracked";
  /** The heading `git status` prints. */
  readonly heading: string;
  /** The zones the section compares, or the one zone it lists. */
  readonly zones: readonly Zone[];
  readonly meaning: string;
  /** "modified: README.md" lines, as `git status` lists them. */
  readonly files: readonly string[];
};

/** Each `git status` section with the pair of zones it compares, for the current repository. */
export function lensSections(world: World): readonly LensSection[] | null {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  if (!repo) return null;
  const status = computeStatus(world.objects, repo, machine.fs);
  const line = (c: { kind: string; path: string }) =>
    `${c.kind === "added" ? "new file" : c.kind}: ${c.path}`;
  return [
    {
      id: "staged",
      heading: "Changes to be committed",
      zones: ["index", "head"],
      meaning: "The staging area compared with the last commit.",
      files: status.staged.map(line),
    },
    {
      id: "unstaged",
      heading: "Changes not staged for commit",
      zones: ["worktree", "index"],
      meaning: "The working tree compared with the staging area.",
      files: status.unstaged.map(line),
    },
    {
      id: "untracked",
      heading: "Untracked files",
      zones: ["worktree"],
      meaning:
        "Files in the working tree that the staging area has never held.",
      files: [...status.untracked],
    },
  ];
}
