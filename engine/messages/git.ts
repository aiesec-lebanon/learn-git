import { GIT_USAGE } from "./git-usage";

export const GIT_VERSION = "2.45.1.windows.1";

export const versionLine = () => `git version ${GIT_VERSION}\n`;

/** The `usage: git ...` block alone, without the command list. */
export const GIT_SYNOPSIS = `${GIT_USAGE.slice(0, GIT_USAGE.indexOf("\n\n"))}\n`;

export function notAGitCommand(
  command: string,
  suggestions: readonly string[],
): string {
  const first = `git: '${command}' is not a git command. See 'git --help'.\n`;
  if (suggestions.length === 0) return first;
  const heading =
    suggestions.length === 1
      ? "The most similar command is"
      : "The most similar commands are";
  return `${first}\n${heading}\n${suggestions.map((s) => `\t${s}\n`).join("")}`;
}

export const NOT_A_REPOSITORY =
  "fatal: not a git repository (or any of the parent directories): .git\n";

export const cannotChangeTo = (path: string) =>
  `fatal: cannot change to '${path}': No such file or directory\n`;

export const unknownGlobalOption = (option: string) =>
  `unknown option: ${option}\n${GIT_SYNOPSIS}`;

export const noDirectoryForC = () =>
  `no directory given for '-C' option\n${GIT_SYNOPSIS}`;

/** Simulator remark for anything this sandbox does not model. */
export const notSimulated = (what: string, gitWould?: string) =>
  `not simulated here: ${what}${gitWould ? ` (in Git: ${gitWould})` : ""}\n`;

/** `usage: ...` then `   or: ...` lines, as Git prints a command's synopsis. */
export const usageBlock = (lines: readonly string[]) =>
  lines.map((l, i) => `${i === 0 ? "usage: " : "   or: "}${l}\n`).join("");
