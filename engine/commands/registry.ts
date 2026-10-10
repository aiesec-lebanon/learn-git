import type { OptionSpec, ParsedOptions } from "../cli/options";
import type {
  Effect,
  InteractionRequest,
  LineRef,
  Machine,
  RefusalCode,
  Repo,
  World,
} from "../types";

export type GitContext = {
  /** The world with this invocation's clock tick already taken. */
  readonly world: World;
  readonly machine: Machine;
  readonly repo: Repo | null;
  readonly options: ParsedOptions;
  /** Seconds since the epoch at which this invocation runs. */
  readonly time: number;
};

export type CommandResult = {
  readonly world?: World;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exitCode?: number;
  readonly effects?: readonly Effect[];
  readonly notes?: readonly string[];
  readonly request?: InteractionRequest;
  readonly lines?: readonly LineRef[];
};

export type GitCommand = {
  readonly name: string;
  /** Whether the command counts toward par (LD section 6). */
  readonly counted: boolean;
  readonly options: readonly OptionSpec[];
  /** Synopsis lines, printed after `usage: ` and `   or: `. */
  readonly usage: readonly string[];
  readonly needsRepo: boolean;
  readonly run: (ctx: GitContext) => CommandResult;
};

type Shared = Omit<GitCommand, "needsRepo" | "run">;

/** Declares a Git command; with `needsRepo` the dispatcher guarantees `ctx.repo`. */
export function defineCommand(
  def: Shared &
    (
      | {
          needsRepo: true;
          run: (ctx: GitContext & { readonly repo: Repo }) => CommandResult;
        }
      | { needsRepo: false; run: (ctx: GitContext) => CommandResult }
    ),
): GitCommand {
  return def as GitCommand;
}

export function createRegistry(
  commands: readonly GitCommand[],
): ReadonlyMap<string, GitCommand> {
  return new Map(commands.map((c) => [c.name, c]));
}

/** A Git refusal: message on stderr, an exit code and a `refused` effect. */
export function refuse(
  code: RefusalCode,
  stderr: string,
  exitCode = 128,
  stdout = "",
): CommandResult {
  return { stdout, stderr, exitCode, effects: [{ kind: "refused", code }] };
}
