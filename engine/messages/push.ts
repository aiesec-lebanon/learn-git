export const PUSH_USAGE =
  "usage: git push [<options>] [<repository> [<refspec>...]]";

const FAST_FORWARDS =
  "hint: See the 'Note about fast-forwards' in 'git push --help' for details.\n";

export const pushMessages = {
  to: (url: string) => `To ${url}\n`,
  remote: (message: string) => `remote: error: ${message}\n`,
  upToDate: () => "Everything up-to-date\n",
  failed: (url: string) => `error: failed to push some refs to '${url}'\n`,
  noDestination: () => `fatal: No configured push destination.
Either specify the URL from the command-line or configure a remote repository using

    git remote add <name> <url>

and then push using the remote name

    git push <name>

`,
  noUpstream: (branch: string, remote: string) =>
    `fatal: The current branch ${branch} has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream ${remote} ${branch}

To have this happen automatically for branches without a tracking
upstream, see 'push.autoSetupRemote' in 'git help config'.

`,
  upstreamNameDiffers: (remote: string, merge: string) =>
    `fatal: The upstream branch of your current branch does not match
the name of your current branch.  To push to the upstream branch
on the remote, use

    git push ${remote} HEAD:${merge}

To push to the branch of the same name on the remote, use

    git push ${remote} HEAD

To choose either option permanently, see push.default in 'git help config'.

To avoid automatically configuring an upstream branch when its name
won't match the local branch, see option 'simple' of branch.autoSetupMerge
in 'git help config'.

`,
  detached: (remote: string) => `fatal: You are not currently on a branch.
To push the history leading to the current (detached HEAD)
state now, use

    git push ${remote} HEAD:<name-of-remote-branch>

`,
  noMatch: (name: string) => `error: src refspec ${name} does not match any\n`,
  noRemoteRef: (name: string) =>
    `error: unable to delete '${name}': remote ref does not exist\n`,
  deleteNeedsRef: () => "fatal: --delete doesn't make sense without any refs\n",
  fetchFirst:
    () => `hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
${FAST_FORWARDS}`,
  behindCurrent:
    () => `hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
${FAST_FORWARDS}`,
  behindOther:
    () => `hint: Updates were rejected because a pushed branch tip is behind its remote
hint: counterpart. If you want to integrate the remote changes, use 'git pull'
hint: before pushing again.
${FAST_FORWARDS}`,
};
