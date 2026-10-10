import type { Oid } from "../types";

/** Exact content, `true` for "present with any content", `null` for "absent". */
export type FileExpectation = string | true | null;

/** How `git status` sees a path. */
export type PathState =
  | "unmodified"
  | "staged"
  | "modified"
  | "staged-and-modified"
  | "untracked"
  | "absent";

/** A commit variable; it binds to a real commit through anchors and parents. */
export type CommitTarget = {
  /** Plain-language name for reports, e.g. "the typo fix". */
  readonly name?: string;
  /** Parent variables in parent order; `[]` is a root commit. */
  readonly parents?: readonly string[];
  /** Files in the commit's snapshot (others are not checked). */
  readonly files?: Readonly<Record<string, FileExpectation>>;
  /** The subject line, checked only when given. */
  readonly message?: string;
};

/** A declarative end state; hashes and times are never compared. */
export type TargetSpec = {
  /** The repository folder relative to home; default: the only repository. */
  readonly repo?: string;
  readonly commits?: Readonly<Record<string, CommitTarget>>;
  /** With `commits`: no other reachable commits allowed (default true). */
  readonly exact?: boolean;
  /** Branch name to commit variable; `null` means the branch must not exist. */
  readonly branches?: Readonly<Record<string, string | null>>;
  readonly head?: { readonly branch: string } | { readonly detached: string };
  readonly paths?: Readonly<Record<string, PathState>>;
  /** Nothing staged, modified or untracked. */
  readonly clean?: boolean;
  readonly worktree?: Readonly<Record<string, FileExpectation>>;
  /** Effective config values; `null` means unset. */
  readonly config?: Readonly<Record<string, string | null>>;
};

export type MatchReport = {
  readonly ok: boolean;
  /** Plain-language differences for "Show differences", target names first. */
  readonly differences: readonly string[];
  /** Commit variables and the commits they matched. */
  readonly bindings: ReadonlyMap<string, Oid>;
};
