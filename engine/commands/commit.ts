import { flag, stringValues, type OptionSpec } from "../cli/options";
import { cleanupMessage, stripMessage, subjectOf } from "../commit/message";
import {
  prepareAll,
  prepareOnly,
  type PreparedCommit,
} from "../commit/prepare";
import { commitSummary } from "../commit/summary";
import { resolveIdentity } from "../config/identity";
import { LIMITS } from "../limits";
import { addMessages } from "../messages/add";
import { notSimulated } from "../messages/git";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { buildTree, flattenTree, type TreeFile } from "../objects/tree";
import { writeObjects } from "../objects/write";
import { parsePathspecs } from "../pathspec";
import { shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { resolveHead, updateRef } from "../refs/refs";
import { stagedFiles } from "../staging/index";
import { computeStatus } from "../status/compute";
import { commitTemplate, longStatus } from "../status/format";
import type { Commit, Effect, Repo, RepoPath, Signature } from "../types";
import { withRepo } from "../world/access";
import { defineCommand, refuse } from "./registry";

const x = (long: string, short?: string, value?: "required" | "optional") => ({
  key: `x-${long}`,
  long,
  ...(short ? { short } : {}),
  ...(value ? { value } : {}),
});

const OPTIONS: readonly OptionSpec[] = [
  { key: "message", short: "m", long: "message", value: "required" },
  { key: "quiet", short: "q", long: "quiet" },
  { key: "all", short: "a", long: "all" },
  x("file", "F", "required"),
  x("amend"),
  x("allow-empty"),
  x("allow-empty-message"),
  x("verbose", "v"),
  x("signoff", "s"),
  x("no-verify", "n"),
  x("edit", "e"),
  x("author", undefined, "required"),
  x("date", undefined, "required"),
  x("cleanup", undefined, "required"),
  x("gpg-sign", "S", "optional"),
  x("fixup", undefined, "required"),
  x("squash", undefined, "required"),
  x("reuse-message", "C", "required"),
  x("reedit-message", "c", "required"),
  x("dry-run"),
  x("reset-author"),
  x("include", "i"),
  x("only", "o"),
  x("status"),
  x("trailer", undefined, "required"),
  x("untracked-files", "u", "optional"),
  x("patch", "p"),
  x("interactive"),
  x("pathspec-from-file", undefined, "required"),
];

const ABORT_EMPTY = "Aborting commit due to empty commit message.\n";

export const commit = defineCommand({
  name: "commit",
  counted: true,
  needsRepo: true,
  usage: `usage: git commit [-a | --interactive | --patch] [-s] [-v] [-u<mode>] [--amend]
                  [--dry-run] [(-c | -C | --squash) <commit> | --fixup [(amend|reword):]<commit>)]
                  [-F <file> | -m <msg>] [--reset-author] [--allow-empty]
                  [--allow-empty-message] [--no-verify] [-e] [--author=<author>]
                  [--date=<date>] [--cleanup=<mode>] [--[no-]status]
                  [-i | -o] [--pathspec-from-file=<file> [--pathspec-file-nul]]
                  [(--trailer <token>[(=|:)<value>])...] [-S[<keyid>]]
                  [--] [<pathspec>...]`,
  options: OPTIONS,
  run: ({ world, machine, repo, options, time, answer }) => {
    const unsupported = [...options.values.keys()].find((k) =>
      k.startsWith("x-"),
    );
    if (unsupported) {
      return refuse(
        "not-simulated",
        notSimulated(`git commit --${unsupported.slice(2)}`),
        1,
      );
    }
    const all = flag(options, "all");
    if (all && options.args.length) {
      return refuse(
        "usage",
        `fatal: paths '${options.args[0]} ...' with -a does not make sense\n`,
      );
    }
    const parent = resolveHead(repo);
    const before: ReadonlyMap<RepoPath, TreeFile> = parent
      ? flattenTree(
          world.objects,
          readObject(world.objects, parent, "commit").tree,
        )
      : new Map();
    let prepared: PreparedCommit = {
      files: stagedFiles(repo.index),
      index: repo.index,
      blobs: [],
      changes: [],
    };
    if (all) prepared = prepareAll(repo, machine.fs);
    if (options.args.length) {
      const parsed = parsePathspecs(options.args, repo.workdir, machine.cwd);
      if (!parsed.ok) {
        return refuse(
          "outside-repository",
          addMessages.outside(parsed.outside, repo.workdir),
        );
      }
      const only = prepareOnly(repo, machine.fs, before, parsed.specs);
      if ("unmatched" in only) {
        return refuse(
          "pathspec-no-match",
          only.unmatched
            .map(
              (s) =>
                `error: pathspec '${s.original}' did not match any file(s) known to git\n`,
            )
            .join(""),
          1,
        );
      }
      prepared = only;
    }
    const identity = resolveIdentity(world, machine, repo);
    if (!identity.ok) return refuse("identity-unknown", identity.stderr);
    const after = prepared.files;
    const { root, trees } = buildTree(after);
    const unchanged = parent
      ? readObject(world.objects, parent, "commit").tree === root
      : after.size === 0;
    if (unchanged) {
      const data = computeStatus(world.objects, repo, machine.fs);
      const view = { data, repo, from: machine.cwd, keep: () => true };
      const written = writeObjects(world, repo.id, trees);
      return {
        world: written.world,
        stdout: longStatus(view, "Initial commit"),
        exitCode: 1,
        effects: [
          ...written.effects,
          { kind: "refused", code: "nothing-to-commit" },
        ],
      };
    }
    const paragraphs = stringValues(options, "message");
    if (paragraphs.length === 0 && answer === undefined) {
      const staged = { ...repo, index: prepared.index };
      const data = computeStatus(world.objects, staged, machine.fs);
      const view = { data, repo: staged, from: machine.cwd, keep: () => true };
      return {
        request: {
          kind: "editor",
          purpose: "commit-message",
          file: ".git/COMMIT_EDITMSG",
          initial: commitTemplate(view),
        },
      };
    }
    const message = paragraphs.length
      ? cleanupMessage(paragraphs)
      : stripMessage(answer ?? "");
    if (message === "") return refuse("empty-message", ABORT_EMPTY, 1);
    if (message.length > LIMITS.messageChars) {
      return refuse(
        "not-simulated",
        notSimulated(`commit messages over ${LIMITS.messageChars} characters`),
        1,
      );
    }
    const who: Signature = { ...identity.ident, time, tz: "+0000" };
    const object: Commit = {
      type: "commit",
      tree: root,
      parents: parent ? [parent] : [],
      author: who,
      committer: who,
      message,
    };
    const written = writeObjects(world, repo.id, [
      ...prepared.blobs,
      ...trees,
      ...(options.args.length
        ? buildTree(stagedFiles(prepared.index)).trees
        : []),
      object,
    ]);
    const oid = written.oids.at(-1) ?? root;
    const subject = subjectOf(message);
    const firstLine = (message.split("\n")[0] ?? "").trimStart();
    const reflog = `commit${parent ? "" : " (initial)"}: ${firstLine}`;
    const effects: Effect[] = [...written.effects];
    if (prepared.changes.length) {
      effects.push({
        kind: "index-changed",
        repo: repo.id,
        changes: prepared.changes,
      });
    }
    let next: Repo = {
      ...repo,
      index: prepared.index,
      arrival: [...repo.arrival, oid],
    };
    if (repo.head.kind === "symbolic") {
      const moved = updateRef(next, repo.head.ref, oid, who, reflog);
      next = moved.repo;
      effects.push(moved.effect);
    } else {
      const from = repo.head;
      next = appendReflog(
        { ...next, head: { kind: "detached", oid } },
        "HEAD",
        {
          old: from.oid,
          new: oid,
          who,
          message: reflog,
        },
      );
      effects.push({
        kind: "head-changed",
        repo: repo.id,
        from,
        to: next.head,
      });
    }
    const label =
      repo.head.kind === "symbolic"
        ? shortRefName(repo.head.ref)
        : "detached HEAD";
    const pool = written.world.objects;
    const stdout = flag(options, "quiet")
      ? ""
      : `[${label}${parent ? "" : " (root-commit)"} ${abbreviate(pool, oid)}] ${subject}\n${commitSummary(pool, before, after)}`;
    return { world: withRepo(written.world, next), stdout, effects };
  },
});
