export const REBASE_USAGE = `usage: git rebase [-i] [options] [--exec <cmd>] [--onto <newbase> | --keep-base] [<upstream> [<branch>]]
   or: git rebase [-i] [options] [--exec <cmd>] [--onto <newbase>] --root [<branch>]
   or: git rebase --continue | --abort | --skip | --edit-todo`;

export const rebaseMessages = {
  success: (branch: string | null) =>
    `Successfully rebased and updated ${branch ?? "detached HEAD"}.\n`,
  upToDate: (branch: string | null) =>
    branch
      ? `Current branch ${branch} is up to date.\n`
      : "HEAD is up to date.\n",
  invalidUpstream: (name: string) => `fatal: invalid upstream '${name}'\n`,
  invalidOnto: (name: string) =>
    `fatal: Does not point to a valid commit '${name}'\n`,
  noSuchBranch: (name: string) => `fatal: no such branch/commit '${name}'\n`,
  unstaged: () => "error: cannot rebase: You have unstaged changes.\n",
  staged: () =>
    "error: cannot rebase: Your index contains uncommitted changes.\n",
  commitOrStash: () => "error: Please commit or stash them.\n",
  noTracking: (branch: string) =>
    `There is no tracking information for the current branch.
Please specify which branch you want to rebase against.
See git-rebase(1) for details.

    git rebase '<branch>'

If you wish to set tracking information for this branch you can do so with:

    git branch --set-upstream-to=<remote>/<branch> ${branch}

`,
  skipped: (short: string) =>
    `warning: skipped previously applied commit ${short}\n`,
  skippedHint: () =>
    'hint: use --reapply-cherry-picks to include skipped commits\nhint: Disable this message with "git config advice.skippedCherryPicks false"\n',
  couldNotApply: (pick: string) =>
    `error: could not apply ${pick}
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
hint: Disable this message with "git config advice.mergeConflict false"
Could not apply ${pick}
`,
  inProgress: () =>
    `fatal: It seems that there is already a rebase-merge directory, and
I wonder if you are in the middle of another rebase.  If that is the
case, please try
\tgit rebase (--continue | --abort | --skip)
If that is not the case, please
\trm -fr ".git/rebase-merge"
and run me again.  I am stopping in case you still have something
valuable there.

`,
  noRebase: () => "fatal: no rebase in progress\n",
  needsMerge: (paths: readonly string[]) =>
    `${paths.map((p) => `${p}: needs merge\n`).join("")}You must edit all merge conflicts and then
mark them as resolved using git add
`,
  switchWhileRebasing: () =>
    'fatal: cannot switch branch while rebasing\nConsider "git rebase --quit" or "git worktree add".\n',
};
