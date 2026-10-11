import { lastValue, type OptionSpec } from "../cli/options";
import { flag } from "../cli/options";
import { remoteUrl } from "../config/remotes";
import { configValue } from "../config/scopes";
import { ancestorsOf } from "../merge/base";
import { pullMergeMessage } from "../merge/conclude";
import { displayUrl } from "../messages/fetch";
import { notSimulated } from "../messages/git";
import { PULL_USAGE, pullMessages as m } from "../messages/pull";
import { branchRef, shortRefName } from "../refs/names";
import { headBranch, resolveHead } from "../refs/refs";
import type { Machine, Oid, Repo, World } from "../types";
import { repoOf } from "../world/access";
import { defaultRemote, fetchRemote } from "./fetch";
import { integrate, type Integration } from "./merge";
import { startRebase } from "./rebase";
import { defineCommand, refuse, type CommandResult } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "rebase", short: "r", long: "rebase", value: "optional" },
  { key: "ff", long: "ff", constant: "allow", negatable: false },
  { key: "ff", long: "no-ff", constant: "no", negatable: false },
  { key: "ff", long: "ff-only", constant: "only", negatable: false },
  { key: "quiet", short: "q", long: "quiet" },
  x("verbose", "v"),
  x("autostash"),
  x("squash"),
  x("commit"),
  x("edit", "e"),
  x("strategy", "s", "required"),
  x("strategy-option", "X", "required"),
  x("all"),
  x("prune", "p"),
  x("tags", "t"),
  x("depth", undefined, "required"),
  x("dry-run"),
  x("force", "f"),
  x("signoff"),
  x("stat"),
  x("verify"),
  x("allow-unrelated-histories"),
  x("recurse-submodules", undefined, "optional"),
  x("progress"),
];

type Mode = "rebase" | "merge" | undefined;

/** `--rebase`/`--no-rebase`, else `branch.<name>.rebase`, else `pull.rebase`. */
function rebaseMode(
  value: string | boolean | undefined,
  read: (key: string) => string | null | undefined,
  branch: string | null,
): Mode | "unsupported" {
  const chosen =
    value === undefined
      ? ((branch ? read(`branch.${branch}.rebase`) : undefined) ??
        read("pull.rebase") ??
        undefined)
      : String(value);
  if (chosen === undefined) return undefined;
  if (chosen === "true") return "rebase";
  if (chosen === "false") return "merge";
  return "unsupported";
}

/** `--ff`, `--no-ff`, `--ff-only`, else `pull.ff`. */
function ffMode(
  value: string | boolean | undefined,
  read: (key: string) => string | null | undefined,
): Integration["ff"] {
  if (value === "allow" || value === "no" || value === "only") return value;
  const configured = read("pull.ff");
  if (configured === "only") return "only";
  if (configured === "false") return "no";
  return configured === "true" ? "allow" : undefined;
}

/** The branch `git pull` merges: named on the command line, else the upstream's. */
function mergeHead(
  world: World,
  machine: Machine,
  repo: Repo,
  remote: string,
  named: readonly string[],
): { branch: string } | { refusal: CommandResult } {
  if (named.length > 1) {
    return {
      refusal: refuse(
        "not-simulated",
        notSimulated("pulling several branches at once"),
        1,
      ),
    };
  }
  if (named[0] !== undefined) return { branch: named[0] };
  const current = headBranch(repo);
  if (!current) return { refusal: refuse("usage", m.notOnBranch(), 1) };
  const name = shortRefName(current);
  const read = (key: string) => configValue(world, machine, repo, key);
  const merge = read(`branch.${name}.merge`);
  if (!merge || read(`branch.${name}.remote`) !== remote) {
    return { refusal: refuse("no-upstream", m.noTracking(remote, name), 1) };
  }
  return { branch: shortRefName(merge) };
}

export const pull = defineCommand({
  name: "pull",
  counted: true,
  needsRepo: true,
  usage: PULL_USAGE,
  options: OPTIONS,
  run: (ctx) => {
    const { machine, options, time } = ctx;
    const unsupported = refuseUnsimulated("pull", options);
    if (unsupported) return unsupported;
    const [named, ...branches] = options.args;
    const remote = named ?? defaultRemote(ctx.world, machine, ctx.repo);
    const quiet = flag(options, "quiet");
    const action = ["pull", ...(ctx.argv ?? [])].join(" ");
    const read = (key: string) =>
      configValue(ctx.world, machine, ctx.repo, key);
    const current = headBranch(ctx.repo);
    const mode = rebaseMode(
      lastValue(options, "rebase"),
      read,
      current && shortRefName(current),
    );
    if (mode === "unsupported") {
      return refuse(
        "not-simulated",
        notSimulated("git pull --rebase with a value other than true or false"),
        1,
      );
    }
    const fetched = fetchRemote({
      world: ctx.world,
      machine,
      repo: ctx.repo,
      time,
      remote,
      branches,
      prune: false,
      quiet,
      action,
    });
    if (!fetched.ok) {
      const { result } = fetched;
      return { ...result, exitCode: 1 };
    }
    const world = fetched.world;
    const repo = repoOf(world, ctx.repo.id);
    const done = (result: CommandResult): CommandResult => ({
      ...result,
      world: result.world ?? world,
      stderr: fetched.stderr + (result.stderr ?? ""),
      effects: [...fetched.effects, ...(result.effects ?? [])],
    });
    const chosen = mergeHead(world, machine, repo, remote, branches);
    if ("refusal" in chosen) return done(chosen.refusal);
    const url = remoteUrl(world, machine, repo, remote) ?? remote;
    const line = (repo.fetchHead ?? "")
      .split("\n")
      .find(
        (l) =>
          l.split("\t")[1] === "" && l.includes(`branch '${chosen.branch}' of`),
      );
    const theirs = line?.slice(0, 40) as Oid | undefined;
    if (!theirs)
      return done(
        refuse("unknown-revision", m.notFetched(branchRef(chosen.branch)), 1),
      );
    const ff = ffMode(lastValue(options, "ff"), read);
    const head = resolveHead(repo);
    const pool = world.objects;
    const diverged =
      head !== null &&
      !ancestorsOf(pool, theirs).has(head) &&
      !ancestorsOf(pool, head).has(theirs);
    if (mode === undefined && ff === undefined && diverged) {
      return done(refuse("divergent-branches", m.divergent()));
    }
    const canFastForward = head === null || ancestorsOf(pool, theirs).has(head);
    if (mode === "rebase" && !canFastForward) {
      return done(
        startRebase(
          { ...ctx, world, repo },
          {
            upstream: theirs,
            onto: theirs,
            ontoName: theirs,
            branch: null,
            quiet,
            action,
          },
        ),
      );
    }
    return done(
      integrate(
        { world, machine, repo, time },
        {
          theirs,
          typed: theirs,
          ff: mode === "rebase" ? "only" : ff,
          message: pullMergeMessage(repo, chosen.branch, displayUrl(url)),
          quiet,
          allowUnrelated: false,
          action,
        },
      ),
    );
  },
});
