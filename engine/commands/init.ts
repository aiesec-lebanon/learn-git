import { lastValue, type OptionSpec } from "../cli/options";
import { configValue } from "../config/scopes";
import { resolvePath } from "../files/paths";
import { makeDir } from "../files/worktree";
import { initMessages as m } from "../messages/init";
import { notSimulated } from "../messages/git";
import { branchRef, isValidBranchName } from "../refs/names";
import { writeGuard } from "../shell/registry";
import type { ConfigFile, Effect, Repo } from "../types";
import { repoIdFor, withMachine, withRepo } from "../world/access";
import { defineCommand, refuse } from "./registry";

/** What Git for Windows writes into a new repository's `.git/config`. */
const NEW_REPO_CONFIG: ConfigFile = [
  { key: "core.repositoryformatversion", value: "0" },
  { key: "core.filemode", value: "false" },
  { key: "core.bare", value: "false" },
  { key: "core.logallrefupdates", value: "true" },
  { key: "core.symlinks", value: "false" },
  { key: "core.ignorecase", value: "true" },
];

const OPTIONS: readonly OptionSpec[] = [
  { key: "quiet", short: "q", long: "quiet" },
  { key: "branch", short: "b", long: "initial-branch", value: "required" },
  { key: "x-bare", long: "bare" },
  { key: "x-template", long: "template", value: "required" },
  { key: "x-separate-git-dir", long: "separate-git-dir", value: "required" },
  { key: "x-object-format", long: "object-format", value: "required" },
  { key: "x-ref-format", long: "ref-format", value: "required" },
  { key: "x-shared", long: "shared", value: "optional" },
];

export const init = defineCommand({
  name: "init",
  counted: true,
  needsRepo: false,
  usage: `usage: git init [-q | --quiet] [--bare] [--template=<template-directory>]
                [--separate-git-dir <git-dir>] [--object-format=<format>]
                [--ref-format=<format>]
                [-b <branch-name> | --initial-branch=<branch-name>]
                [--shared[=<permissions>]] [<directory>]`,
  options: OPTIONS,
  run: ({ world, machine, options }) => {
    const unsupported = [...options.values.keys()].find((k) =>
      k.startsWith("x-"),
    );
    if (unsupported) {
      return refuse(
        "not-simulated",
        notSimulated(`git init --${unsupported.slice(2)}`),
        1,
      );
    }
    if (options.args.length > 1)
      return refuse("usage", `${init.usage}\n\n`, 129);
    const quiet = lastValue(options, "quiet") === true;
    const requested = lastValue(options, "branch");
    const dir = resolvePath(machine.cwd, options.args[0] ?? ".");
    const guard = writeGuard(dir);
    if (guard) return refuse("not-simulated", notSimulated(guard), 1);
    const existing = [...world.repos.values()].find(
      (r) => r.machine === machine.id && r.workdir === dir,
    );
    if (existing) {
      return {
        stdout: quiet ? "" : m.reinitialized(dir),
        stderr: typeof requested === "string" ? m.ignoredBranch(requested) : "",
        effects: [
          { kind: "repo-created", repo: existing.id, reinitialized: true },
        ],
      };
    }
    const configured = configValue(world, machine, null, "init.defaultbranch");
    const branch =
      typeof requested === "string" ? requested : (configured ?? "master");
    const valid = isValidBranchName(branch);
    const folder = makeDir(machine.fs, dir);
    const fs = valid ? makeDir(folder, `${dir}/.git`) : folder;
    const created = [...fs.dirs].filter((d) => !machine.fs.dirs.has(d));
    const effects: Effect[] = created.length
      ? [
          {
            kind: "files-changed",
            machine: machine.id,
            changes: created.map((path) => ({
              path,
              change: "added",
              node: "dir",
            })),
          },
        ]
      : [];
    const moved = withMachine(world, { ...machine, fs });
    if (!valid) {
      const refusal = refuse("usage", m.invalidBranch(branch));
      return {
        ...refusal,
        world: moved,
        effects: [...effects, ...(refusal.effects ?? [])],
      };
    }
    const repo: Repo = {
      id: repoIdFor(machine.id, dir),
      machine: machine.id,
      workdir: dir,
      head: { kind: "symbolic", ref: branchRef(branch) },
      refs: new Map(),
      reflogs: new Map(),
      index: new Map(),
      config: NEW_REPO_CONFIG,
      arrival: [],
    };
    effects.push({ kind: "repo-created", repo: repo.id, reinitialized: false });
    const hint =
      configured === undefined && typeof requested !== "string"
        ? m.masterHint()
        : "";
    return {
      world: withRepo(moved, repo),
      stdout: quiet ? "" : m.initialized(dir),
      stderr: hint,
      effects,
    };
  },
});
