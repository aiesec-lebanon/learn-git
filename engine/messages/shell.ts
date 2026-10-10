import type { TokenizeError } from "../cli/tokenize";
import { LIMITS } from "../limits";
import { notSimulated } from "./git";

/** What bash (or the sandbox) prints when a line cannot be parsed. */
export function tokenizeErrorOutput(error: TokenizeError): {
  stderr: string;
  exitCode: number;
} {
  switch (error.kind) {
    case "unexpected-token":
      return {
        stderr: `bash: syntax error near unexpected token \`${error.token}'\n`,
        exitCode: 2,
      };
    case "unexpected-eof":
      return {
        stderr: "bash: syntax error: unexpected end of file\n",
        exitCode: 2,
      };
    case "unmatched-quote":
      return {
        stderr: `bash: unexpected EOF while looking for matching \`${error.quote}'\n`,
        exitCode: 2,
      };
    case "unsupported":
      return {
        stderr: notSimulated(`${error.feature} in the shell`),
        exitCode: 1,
      };
    case "too-long":
      return {
        stderr: notSimulated(
          `commands longer than ${LIMITS.lineChars} characters`,
        ),
        exitCode: 1,
      };
    case "too-many-words":
      return {
        stderr: notSimulated(`commands with more than ${LIMITS.words} words`),
        exitCode: 1,
      };
  }
}

const SAFE_NAME = /^[A-Za-z0-9_\-.,:/@%+=]+$/;
/** GNU's quoting when a name needs it (cat), and always (ls, rm, mkdir, mv, touch). */
const quoteIfNeeded = (name: string) =>
  SAFE_NAME.test(name) ? name : `'${name}'`;
const q = (name: string) => `'${name}'`;

export const shellMessages = {
  notFound: (program: string) => `bash: ${program}: command not found\n`,
  cdMissing: (dir: string) => `bash: cd: ${dir}: No such file or directory\n`,
  cdNotDir: (dir: string) => `bash: cd: ${dir}: Not a directory\n`,
  cdTooMany: () => "bash: cd: too many arguments\n",
  redirectMissing: (target: string) =>
    `bash: ${target}: No such file or directory\n`,
  redirectIsDir: (target: string) => `bash: ${target}: Is a directory\n`,
  lsMissing: (name: string) =>
    `ls: cannot access ${q(name)}: No such file or directory\n`,
  catMissing: (name: string) =>
    `cat: ${quoteIfNeeded(name)}: No such file or directory\n`,
  catIsDir: (name: string) => `cat: ${quoteIfNeeded(name)}: Is a directory\n`,
  touchMissing: (name: string) =>
    `touch: cannot touch ${q(name)}: No such file or directory\n`,
  mkdirExists: (name: string) =>
    `mkdir: cannot create directory ${q(name)}: File exists\n`,
  mkdirMissing: (name: string) =>
    `mkdir: cannot create directory ${q(name)}: No such file or directory\n`,
  rmMissing: (name: string) =>
    `rm: cannot remove ${q(name)}: No such file or directory\n`,
  rmIsDir: (name: string) => `rm: cannot remove ${q(name)}: Is a directory\n`,
  missingOperand: (program: string) =>
    `${program}: missing operand\nTry '${program} --help' for more information.\n`,
  mvMissing: (name: string) =>
    `mv: cannot stat ${q(name)}: No such file or directory\n`,
  mvNotDir: (name: string) => `mv: target ${q(name)} is not a directory\n`,
  mvIntoSelf: (from: string, to: string) =>
    `mv: cannot move ${q(from)} to a subdirectory of itself, ${q(to)}\n`,
  mvDirOverFile: (to: string, from: string) =>
    `mv: cannot overwrite non-directory ${q(to)} with directory ${q(from)}\n`,
  mvNoParent: (from: string, to: string) =>
    `mv: cannot move ${q(from)} to ${q(to)}: No such file or directory\n`,
  editUsage: () => "edit: usage: edit <file> (opens the sandbox editor)\n",
  editIsDir: (name: string) => `edit: ${q(name)}: Is a directory\n`,
  editMissing: (name: string) =>
    `edit: ${q(name)}: No such file or directory\n`,
};

export const SANDBOX_HELP = `Shell commands in this sandbox:
  cd, pwd, ls [-a], cat, echo [-n] (with > and >>), touch, mkdir [-p],
  rm [-r] [-f], mv, edit <file> (an editor for this sandbox), clear, help
Git commands behave like Git; "git help <command>" opens its reference entry.
`;
