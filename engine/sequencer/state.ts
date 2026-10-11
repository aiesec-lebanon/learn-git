import { subjectOf } from "../commit/message";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { shortRefName } from "../refs/names";
import type { ObjectPool, Oid, RebaseOperation } from "../types";

const pickLine = (pool: ObjectPool, oid: Oid) =>
  `   pick ${abbreviate(pool, oid)} ${subjectOf(readObject(pool, oid, "commit").message)}`;

const commands = (n: number) => `${n} command${n === 1 ? "" : "s"}`;

/**
 * The rebase paragraph `git status` prints instead of the branch line.
 * `hints` is null in a commit message template (no advice there).
 */
export function rebaseStatusLines(
  pool: ObjectPool,
  op: RebaseOperation,
  hints: "conflicts" | "fixed" | null,
): string[] {
  const onto = abbreviate(pool, op.onto);
  const lines = [`interactive rebase in progress; onto ${onto}`];
  const done = op.done.length;
  lines.push(
    done === 1
      ? "Last command done (1 command done):"
      : `Last commands done (${commands(done)} done):`,
    ...op.done.slice(-2).map((oid) => pickLine(pool, oid)),
  );
  if (done > 2) lines.push("  (see more in file .git/rebase-merge/done)");
  const left = op.todo.length;
  if (!left) lines.push("No commands remaining.");
  else {
    lines.push(
      left === 1
        ? "Next command to do (1 remaining command):"
        : `Next commands to do (${left} remaining commands):`,
      ...op.todo.slice(0, 2).map((oid) => pickLine(pool, oid)),
    );
    if (hints) lines.push('  (use "git rebase --edit-todo" to view and edit)');
  }
  const branch = op.branch ? shortRefName(op.branch) : "HEAD";
  lines.push(`You are currently rebasing branch '${branch}' on '${onto}'.`);
  if (hints === "conflicts") {
    lines.push(
      '  (fix conflicts and then run "git rebase --continue")',
      '  (use "git rebase --skip" to skip this patch)',
      '  (use "git rebase --abort" to check out the original branch)',
    );
  } else if (hints === "fixed") {
    lines.push('  (all conflicts fixed: run "git rebase --continue")');
  }
  return lines;
}
