export const BRANCH_USAGE = `usage: git branch [<options>] [-r | -a] [--merged] [--no-merged]
   or: git branch [<options>] [-f] [--recurse-submodules] <branch-name> [<start-point>]
   or: git branch [<options>] [-l] [<pattern>...]
   or: git branch [<options>] [-r] (-d | -D) <branch-name>...
   or: git branch [<options>] (-m | -M) [<old-branch>] <new-branch>
   or: git branch [<options>] (-c | -C) [<old-branch>] <new-branch>
   or: git branch [<options>] [-r | -a] [--points-at]
   or: git branch [<options>] [-r | -a] [--format]`;

export const branchMessages = {
  invalidName: (name: string) =>
    `fatal: '${name}' is not a valid branch name
hint: See \`man git check-ref-format\`
hint: Disable this message with "git config advice.refSyntax false"
`,
  exists: (name: string) => `fatal: a branch named '${name}' already exists\n`,
  notValidObject: (name: string) =>
    `fatal: not a valid object name: '${name}'\n`,
  notBranchPoint: (name: string) =>
    `fatal: not a valid branch point: '${name}'\n`,
  cannotLock: (ref: string, existing: string) =>
    `fatal: cannot lock ref '${ref}': '${existing}' exists; cannot create '${ref}'\n`,
  nameRequired: () => "fatal: branch name required\n",
  notFound: (name: string) => `error: branch '${name}' not found\n`,
  usedByWorktree: (name: string, workdir: string) =>
    `error: cannot delete branch '${name}' used by worktree at '${workdir}'\n`,
  forceUsedByWorktree: (name: string, workdir: string) =>
    `fatal: cannot force update the branch '${name}' used by worktree at '${workdir}'\n`,
  notFullyMerged: (name: string) =>
    `error: the branch '${name}' is not fully merged
hint: If you are sure you want to delete it, run 'git branch -D ${name}'
hint: Disable this message with "git config advice.forceDeleteBranch false"
`,
  mergedNotToHead: (name: string, ref: string) =>
    `warning: deleting branch '${name}' that has been merged to
         '${ref}', but not yet merged to HEAD\n`,
  deleted: (name: string, short: string) =>
    `Deleted branch ${name} (was ${short}).\n`,
  noBranchNamed: (name: string) => `fatal: no branch named '${name}'\n`,
  renameDetached: () =>
    "fatal: cannot rename the current branch while not on any\n",
  tooManyRename: () => "fatal: too many arguments for a rename operation\n",
};
