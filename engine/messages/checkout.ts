const listed = (paths: readonly string[]) =>
  paths.map((p) => `\t${p}\n`).join("");

export const SWITCH_USAGE = `usage: git switch [<options>] [<branch>]`;

export const checkoutMessages = {
  wouldOverwrite: (
    local: readonly string[],
    untracked: readonly string[],
    action: "checkout" | "merge" = "checkout",
  ) => {
    const then = action === "merge" ? "merge" : "switch branches";
    return `${
      local.length
        ? `error: Your local changes to the following files would be overwritten by ${action}:
${listed(local)}Please commit your changes or stash them before you ${then}.
`
        : ""
    }${
      untracked.length
        ? `error: The following untracked working tree files would be overwritten by ${action}:
${listed(untracked)}Please move or remove them before you ${then}.
`
        : ""
    }Aborting
`;
  },
  invalidReference: (name: string) => `fatal: invalid reference: ${name}\n`,
  missingArgument: () => "fatal: missing branch or commit argument\n",
  oneReference: () => "fatal: only one reference expected\n",
  detachWithCreate: () =>
    "fatal: '--detach' cannot be used with '-b/-B/--orphan'\n",
  branchExpected: (name: string) =>
    `fatal: a branch is expected, got commit '${name}'
hint: If you want to detach HEAD at the commit, try again with the --detach option.
`,
  switched: (name: string) => `Switched to branch '${name}'\n`,
  setUpToTrack: (name: string, upstream: string) =>
    `branch '${name}' set up to track '${upstream}'.\n`,
  switchedNew: (name: string) => `Switched to a new branch '${name}'\n`,
  switchedReset: (name: string) => `Switched to and reset branch '${name}'\n`,
  resetBranch: (name: string) => `Reset branch '${name}'\n`,
  alreadyOn: (name: string) => `Already on '${name}'\n`,
  headNowAt: (short: string, subject: string) =>
    `HEAD is now at ${short} ${subject}\n`,
  leavingBehind: (count: number, lines: string, short: string) => {
    const one = count === 1;
    return `Warning: you are leaving ${count} commit${one ? "" : "s"} behind, not connected to
any of your branches:

${lines}
If you want to keep ${one ? "it" : "them"} by creating a new branch, this may be a good time
to do so with:

 git branch <new-branch-name> ${short}

`;
  },
  andMore: (count: number) => ` ... and ${count} more.\n`,
  detachAdvice: (name: string) => `Note: switching to '${name}'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

`,
  updatedPaths: (count: number, from: string) =>
    `Updated ${count} path${count === 1 ? "" : "s"} from ${from}\n`,
  referencesGiven: (count: number) =>
    `fatal: only one reference expected, ${count} given.\n`,
  previousPosition: (short: string, subject: string) =>
    `Previous HEAD position was ${short} ${subject}\n`,
};
