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
