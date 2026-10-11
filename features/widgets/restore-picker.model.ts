import {
  computeStatus,
  discoverRepo,
  machineOf,
  overwrites,
  runLine,
  shellQuote,
  type World,
} from "@/engine";
import { diffLines, lensOutput, type DiffLine } from "./diff-lens.model";

export type Place = "head" | "index" | "worktree";

export const PLACES: readonly { id: Place; title: string }[] = [
  { id: "head", title: "Last commit" },
  { id: "index", title: "Staging area" },
  { id: "worktree", title: "Working tree" },
];

export type Direction =
  | {
      readonly command: string;
      readonly meaning: string;
      readonly safe: boolean;
    }
  | { readonly why: string };

/** The `git restore` line that copies `file` from `source` to `target`, or why that pair is not a restore. */
export function restoreDirection(
  source: Place,
  target: Place,
  file = "<file>",
): Direction {
  if (source === target) return { why: "Pick two different places." };
  if (target === "head")
    return {
      why: "A commit never changes. Recording something new is git commit.",
    };
  if (source === "worktree")
    return {
      why: "Copying your file into the staging area is git add, not a restore.",
    };
  if (target === "index")
    return {
      command: `git restore --staged ${file}`,
      meaning:
        "Unstages: the draft goes back to the last commit's version. Your file keeps every edit.",
      safe: true,
    };
  if (source === "index")
    return {
      command: `git restore ${file}`,
      meaning:
        "Copies the staged version over your file. Edits you never staged are gone.",
      safe: false,
    };
  return {
    command: `git restore --source=HEAD ${file}`,
    meaning:
      "Copies the last commit's version over your file and leaves the draft alone. Edits in your file are gone.",
    safe: false,
  };
}

/** Tracked files whose working copy differs from the staging area: what `git restore <file>` would overwrite. */
export function discardable(world: World): readonly string[] {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  if (!repo) return [];
  return computeStatus(world.objects, repo, machine.fs)
    .unstaged.filter((c) => c.kind === "modified")
    .map((c) => c.path);
}

export type DiscardPreview = {
  readonly command: string;
  /** The edits the command throws away, as `git diff` shows them. */
  readonly lines: readonly DiffLine[];
  /** True when no commit or staged copy holds the current content. */
  readonly lost: boolean;
};

/** What discarding one file's edits would overwrite, computed without running it. */
export function discardPreview(before: World, path: string): DiscardPreview {
  const command = `git restore ${shellQuote(path)}`;
  const after = runLine(before, command).world;
  return {
    command,
    lines: diffLines(lensOutput(before, `git diff -- ${shellQuote(path)}`)),
    lost: overwrites(before, after).some((o) => o.lost),
  };
}
