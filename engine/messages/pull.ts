export const PULL_USAGE =
  "usage: git pull [<options>] [<repository> [<refspec>...]]";

const SPECIFY = `Please specify which branch you want to merge with.
See git-pull(1) for details.

    git pull <remote> <branch>

`;

export const pullMessages = {
  divergent:
    () => `hint: You have divergent branches and need to specify how to reconcile them.
hint: You can do so by running one of the following commands sometime before
hint: your next pull:
hint:
hint:   git config pull.rebase false  # merge
hint:   git config pull.rebase true   # rebase
hint:   git config pull.ff only       # fast-forward only
hint:
hint: You can replace "git config" with "git config --global" to set a default
hint: preference for all repositories. You can also pass --rebase, --no-rebase,
hint: or --ff-only on the command line to override the configured default per
hint: invocation.
fatal: Need to specify how to reconcile divergent branches.
`,
  notOnBranch: () => `You are not currently on a branch.\n${SPECIFY}`,
  noTracking: (remote: string, branch: string) =>
    `There is no tracking information for the current branch.
${SPECIFY}If you wish to set tracking information for this branch you can do so with:

    git branch --set-upstream-to=${remote}/<branch> ${branch}

`,
  notFetched: (merge: string) =>
    `Your configuration specifies to merge with the ref '${merge}'
from the remote, but no such ref was fetched.
`,
};
