export const initMessages = {
  initialized: (dir: string) =>
    `Initialized empty Git repository in ${dir}/.git/\n`,
  reinitialized: (dir: string) =>
    `Reinitialized existing Git repository in ${dir}/.git/\n`,
  ignoredBranch: (branch: string) =>
    `warning: re-init: ignored --initial-branch=${branch}\n`,
  invalidBranch: (branch: string) =>
    `fatal: invalid initial branch name: '${branch}'\n`,
  masterHint:
    () => `hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint:
hint: \tgit config --global init.defaultBranch <name>
hint:
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint:
hint: \tgit branch -m <name>
`,
};
