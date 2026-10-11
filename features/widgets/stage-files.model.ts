import { shellQuote } from "@/engine";
import type { FileCard, StageFiles } from "@/features/stage/files";

/** The one drop target: the staging area. */
export const STAGING = "staging";
export const TARGETS = [STAGING] as const;

/** Working-tree files whose content `git add` would copy: changed, new or deleted. */
export const carryable = (files: StageFiles): readonly FileCard[] =>
  files.index === null
    ? []
    : files.worktree.filter(
        (f) =>
          f.state !== null && f.state !== "unmodified" && f.state !== "ignored",
      );

/** The command a drop runs, or null when the target is not the staging area. */
export const dropCommand = (path: string, target: string | null) =>
  target === STAGING ? `git add ${shellQuote(path)}` : null;
