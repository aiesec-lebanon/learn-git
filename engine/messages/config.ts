export const configMessages = {
  localOutside: () =>
    "fatal: --local can only be used inside a git repository\n",
  notInGitDir: () => "fatal: not in a git directory\n",
  noSection: (key: string) => `error: key does not contain a section: ${key}\n`,
  invalidKey: (key: string) => `error: invalid key: ${key}\n`,
  systemLocked: () =>
    "error: could not lock config file C:/Program Files/Git/etc/gitconfig: Permission denied\n",
  noGlobalFile: (home: string) =>
    `fatal: unable to read config file '${home}/.gitconfig': No such file or directory\n`,
  wrongArgs: (expected: string, usage: string) =>
    `error: wrong number of arguments, should be ${expected}\n${usage}\n\n`,
  legacySet: (name: string, value: string) =>
    `Older form of: git config set ${name} ${value} (Git 2.46 and later)`,
};

export const CONFIG_USAGE = {
  legacy: "usage: git config [<options>]",
  list: "usage: git config list [<file-option>] [<display-option>] [--includes]",
  get: "usage: git config get [<file-option>] [<display-option>] [--includes] [--all] [--regexp] [--value=<value>] [--fixed-value] [--default=<default>] <name>",
  set: "usage: git config set [<file-option>] [--type=<type>] [--all] [--value=<value>] [--fixed-value] <name> <value>",
  unset:
    "usage: git config unset [<file-option>] [--all] [--value=<value>] [--fixed-value] <name>",
};
