const listed = (paths: readonly string[]) =>
  paths.map((p) => `\t${p}\n`).join("");

export const SWITCH_USAGE = `usage: git switch [<options>] [<branch>]`;

export const checkoutMessages = {
  wouldOverwrite: (local: readonly string[], untracked: readonly string[]) =>
    `${
      local.length
        ? `error: Your local changes to the following files would be overwritten by checkout:\n${listed(local)}Please commit your changes or stash them before you switch branches.\n`
        : ""
    }${
      untracked.length
        ? `error: The following untracked working tree files would be overwritten by checkout:\n${listed(untracked)}Please move or remove them before you switch branches.\n`
        : ""
    }Aborting\n`,
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
  switchedNew: (name: string) => `Switched to a new branch '${name}'\n`,
  switchedReset: (name: string) => `Switched to and reset branch '${name}'\n`,
  resetBranch: (name: string) => `Reset branch '${name}'\n`,
  alreadyOn: (name: string) => `Already on '${name}'\n`,
  headNowAt: (short: string, subject: string) =>
    `HEAD is now at ${short} ${subject}\n`,
  previousPosition: (short: string, subject: string) =>
    `Previous HEAD position was ${short} ${subject}\n`,
};
