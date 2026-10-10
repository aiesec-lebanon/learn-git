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
