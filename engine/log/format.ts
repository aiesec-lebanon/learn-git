import { lastValue, type OptionSpec, type ParsedOptions } from "../cli/options";
import { refuse, type CommandResult } from "../commands/registry";
import { subjectOf } from "../commit/message";
import { changedPairs, commitSnapshot, treeSnapshot } from "../diff/forms";
import type { FilePair } from "../diff/unified";
import { decorations } from "../format/decorate";
import { formatGitDate } from "../format/date";
import { notSimulated } from "../messages/git";
import { noCommitsYet } from "../messages/revisions";
import { abbreviate } from "../objects/abbrev";
import type { Pathspec } from "../pathspec";
import { shortRefName } from "../refs/names";
import type { Commit, ObjectPool, Oid, Repo } from "../types";

export type HeaderStyle = {
  readonly oneline: boolean;
  readonly decorated: boolean;
};

/** `--oneline` and `--decorate`, shared by `log` and `show`. */
export const HEADER_OPTIONS: readonly OptionSpec[] = [
  { key: "oneline", long: "oneline", negatable: false },
  { key: "decorate", long: "decorate", value: "optional" },
];

export function headerStyle(
  command: string,
  options: ParsedOptions,
): HeaderStyle | CommandResult {
  const decorate = lastValue(options, "decorate");
  if (
    typeof decorate === "string" &&
    decorate !== "short" &&
    decorate !== "no"
  ) {
    return refuse(
      "not-simulated",
      notSimulated(`git ${command} --decorate=${decorate}`),
      1,
    );
  }
  return {
    oneline: lastValue(options, "oneline") === true,
    decorated: decorate !== false && decorate !== "no",
  };
}

const indent = (message: string) =>
  message
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => `    ${line}\n`)
    .join("");

/** A commit as `git log` prints it: the `commit` block or one `--oneline` line. */
export function commitHeader(
  pool: ObjectPool,
  repo: Repo,
  oid: Oid,
  commit: Commit,
  style: HeaderStyle,
): string {
  const names = style.decorated ? decorations(repo, oid) : [];
  const label = names.length ? ` (${names.join(", ")})` : "";
  if (style.oneline) {
    return `${abbreviate(pool, oid)}${label} ${subjectOf(commit.message)}\n`;
  }
  const { author, parents } = commit;
  const merge =
    parents.length > 1
      ? `Merge: ${parents.map((p) => abbreviate(pool, p)).join(" ")}\n`
      : "";
  return `commit ${oid}${label}\n${merge}Author: ${author.name} <${author.email}>\nDate:   ${formatGitDate(author.time, author.tz)}\n\n${indent(commit.message)}`;
}

/** What a commit changed against its first parent (all files for a root commit). */
export function commitChanges(
  pool: ObjectPool,
  commit: Commit,
  specs: readonly Pathspec[],
): FilePair[] {
  return changedPairs(
    commitSnapshot(pool, commit.parents[0] ?? null),
    treeSnapshot(pool, commit.tree),
    specs,
  );
}

export function unbornRefusal(repo: Repo): CommandResult {
  const branch =
    repo.head.kind === "symbolic" ? shortRefName(repo.head.ref) : "HEAD";
  return refuse("unborn-branch", noCommitsYet(branch));
}

/** A commit block followed by its rendered changes, spaced as `log` and `show` print them. */
export function commitEntry(
  pool: ObjectPool,
  repo: Repo,
  walked: { readonly oid: Oid; readonly commit: Commit },
  style: HeaderStyle,
  changes: string,
): string {
  const header = commitHeader(pool, repo, walked.oid, walked.commit, style);
  return style.oneline || !changes ? header + changes : `${header}\n${changes}`;
}
