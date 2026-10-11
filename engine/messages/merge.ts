export const MERGE_USAGE = `usage: git merge [<options>] [<commit>...]
   or: git merge --abort
   or: git merge --continue`;

export const mergeMessages = {
  noRemote: () => "fatal: No remote for the current branch.\n",
  notSomething: (name: string) =>
    `merge: ${name} - not something we can merge\n`,
  upToDate: () => "Already up to date.\n",
  updating: (from: string, to: string) => `Updating ${from}..${to}\n`,
  fastForward: () => "Fast-forward\n",
  madeBy: () => "Merge made by the 'ort' strategy.\n",
  automaticFailed: () =>
    "Automatic merge failed; fix conflicts and then commit the result.\n",
  indexHasChanges: (paths: readonly string[]) =>
    `error: Your local changes to the following files would be overwritten by merge:\n  ${paths.join(" ")}\n`,
  unrelated: () => "fatal: refusing to merge unrelated histories\n",
  unmerged: (doing: "Merging" | "Committing") =>
    `error: ${doing} is not possible because you have unmerged files.
hint: Fix them up in the work tree, and then use 'git add/rm <file>'
hint: as appropriate to mark resolution and make a commit.
fatal: Exiting because of an unresolved conflict.
`,
  notConcluded: () =>
    "fatal: You have not concluded your merge (MERGE_HEAD exists).\nPlease, commit your changes before you merge.\n",
  switchWhileMerging: () =>
    'fatal: cannot switch branch while merging\nConsider "git merge --quit" or "git worktree add".\n',
  notPossibleToFastForward:
    () => `hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: \tgit merge --no-ff
hint:
hint: or:
hint:
hint: \tgit rebase
hint:
hint: Disable this message with "git config advice.diverging false"
fatal: Not possible to fast-forward, aborting.
`,
};
