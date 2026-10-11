import type { CommandResult, GitCommand } from "../commands/registry";
import { refuse } from "../commands/registry";
import { resolvePath } from "../files/paths";
import { GIT_COMMANDS, OTHER_COMMANDS } from "../messages/commands";
import {
  cannotChangeTo,
  noDirectoryForC,
  notAGitCommand,
  NOT_A_REPOSITORY,
  notSimulated,
  unknownGlobalOption,
  versionLine,
} from "../messages/git";
import { GIT_USAGE } from "../messages/git-usage";
import { optionErrorOutput } from "../messages/options";
import { discoverRepo } from "../repo/discover";
import type { Machine, World } from "../types";
import { machineOf, withMachine } from "../world/access";
import { parseOptions } from "./options";
import { suggestCommands } from "./suggest";

export type Dispatched = CommandResult & {
  readonly command: string;
  readonly counted: boolean;
};

const IGNORED_GLOBALS = new Set(["-P", "--no-pager", "-p", "--paginate"]);
const UNSIMULATED_GLOBALS = new Set([
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--bare",
  "--exec-path",
  "--html-path",
  "--man-path",
  "--info-path",
  "--no-replace-objects",
  "--config-env",
  "--literal-pathspecs",
  "--glob-pathspecs",
  "--noglob-pathspecs",
  "--icase-pathspecs",
  "--no-optional-locks",
  "--super-prefix",
  "--list-cmds",
]);

const openReference = (entryId: string, command: string): Dispatched => ({
  command,
  counted: false,
  request: { kind: "open-reference", entryId },
});

/**
 * Runs `git <args>`: global options, `help` and `-h` routing, unknown and
 * unsimulated commands, option parsing and repository discovery. Commands
 * come from `registry`, so adding one never edits this function.
 */
export function dispatchGit(
  world: World,
  machine: Machine,
  args: readonly string[],
  time: number,
  registry: ReadonlyMap<string, GitCommand>,
  answer?: string,
): Dispatched {
  let at = 0;
  let cwd = machine.cwd;
  const done = (result: CommandResult, command = "git"): Dispatched => ({
    ...result,
    command,
    counted: false,
  });
  for (; at < args.length && (args[at] ?? "").startsWith("-"); at++) {
    const arg = args[at] ?? "";
    const name = arg.split("=")[0] ?? arg;
    if (arg === "--version" || arg === "-v") {
      return done({ stdout: versionLine() });
    }
    if (arg === "-h" || arg === "--help") return openReference("git", "git");
    if (arg === "-C") {
      const target = args[++at];
      if (target === undefined) {
        return done(refuse("usage", noDirectoryForC(), 129));
      }
      const dir = resolvePath(cwd, target);
      if (!machine.fs.dirs.has(dir)) {
        return done(refuse("usage", cannotChangeTo(target), 128));
      }
      cwd = dir;
    } else if (UNSIMULATED_GLOBALS.has(name)) {
      return done(refuse("not-simulated", notSimulated(`git ${name}`), 1));
    } else if (!IGNORED_GLOBALS.has(arg)) {
      return done(refuse("usage", unknownGlobalOption(arg), 129));
    }
  }
  const name = args[at];
  if (name === undefined) return done({ stdout: GIT_USAGE, exitCode: 1 });
  const rest = args.slice(at + 1);
  const command = `git ${name}`;
  if (name === "help") return openReference(rest[0] ?? "git", command);
  if (name === "version") return done({ stdout: versionLine() }, command);
  const def = registry.get(name);
  if (!def) {
    if (GIT_COMMANDS.has(name) || OTHER_COMMANDS.includes(name)) {
      const description = GIT_COMMANDS.get(name)?.toLowerCase();
      return done(
        refuse("not-simulated", notSimulated(command, description), 1),
        command,
      );
    }
    return done(
      refuse("unknown-command", notAGitCommand(name, suggestCommands(name)), 1),
      command,
    );
  }
  const beforeDashDash = rest.includes("--")
    ? rest.slice(0, rest.indexOf("--"))
    : rest;
  if (
    (rest.length === 1 && rest[0] === "-h") ||
    beforeDashDash.includes("--help")
  ) {
    return openReference(name, command);
  }
  const located = { ...machine, cwd };
  const repo = discoverRepo(world, located);
  const result = (): CommandResult => {
    if (def.needsRepo && !repo) {
      return refuse("not-a-repository", NOT_A_REPOSITORY);
    }
    const parsed = parseOptions(rest, def.options);
    if (!parsed.ok) {
      if (parsed.error.kind === "help") return openReference(name, command);
      return {
        ...optionErrorOutput(parsed.error, def.usage),
        exitCode: 129,
        effects: [{ kind: "refused", code: "usage" }],
      };
    }
    return def.run({
      world,
      machine: located,
      repo,
      options: parsed.options,
      argv: rest,
      time,
      ...(answer === undefined ? {} : { answer }),
    });
  };
  const outcome = result();
  const restored =
    outcome.world && cwd !== machine.cwd
      ? withMachine(outcome.world, {
          ...machineOf(outcome.world, machine.id),
          cwd: machine.cwd,
        })
      : outcome.world;
  return { ...outcome, world: restored, command, counted: def.counted };
}
