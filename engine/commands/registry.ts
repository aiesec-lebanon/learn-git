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
  /** The arguments after the command name, as typed (reflog actions quote them). */
  readonly argv?: readonly string[];
  /** Seconds since the epoch at which this invocation runs. */
  readonly time: number;
  /** What the editor returned when a waiting command resumes. */
  readonly answer?: string;
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
  /** The synopsis block Git prints, starting with `usage: `. */
  readonly usage: string;
  readonly needsRepo: boolean;
  /** An older form kept for habit; it runs a modern command and says which. */
  readonly legacy?: boolean;
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
