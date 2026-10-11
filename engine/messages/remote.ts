export const REMOTE_USAGE = `usage: git remote [-v | --verbose]
   or: git remote add [-t <branch>] [-m <master>] [-f] [--tags | --no-tags] [--mirror=<fetch|push>] <name> <url>
   or: git remote rename [--[no-]progress] <old> <new>
   or: git remote remove <name>
   or: git remote set-head <name> (-a | --auto | -d | --delete | <branch>)
   or: git remote [-v | --verbose] show [-n] <name>
   or: git remote prune [-n | --dry-run] <name>
   or: git remote [-v | --verbose] update [-p | --prune] [(<group> | <remote>)...]
   or: git remote set-branches [--add] <name> <branch>...
   or: git remote get-url [--push] [--all] <name>
   or: git remote set-url [--push] <name> <newurl> [<oldurl>]
   or: git remote set-url --add <name> <newurl>
   or: git remote set-url --delete <name> <url>`;

export const REMOTE_ADD_USAGE =
  "usage: git remote add [<options>] <name> <url>";

export const REMOTE_SUBCOMMANDS = [
  "add",
  "rename",
  "remove",
  "rm",
  "set-head",
  "show",
  "prune",
  "update",
  "set-branches",
  "get-url",
  "set-url",
];

export const remoteMessages = {
  unknownSubcommand: (name: string) =>
    `error: unknown subcommand: \`${name}'\n${REMOTE_USAGE}\n\n`,
  exists: (name: string) => `error: remote ${name} already exists.\n`,
  invalidName: (name: string) =>
    `fatal: '${name}' is not a valid remote name\n`,
};

/** Why a remote cannot be reached, as Git words it for each kind of address. */
export const networkMessages = {
  notFound: (url: string) =>
    `fatal: repository '${url.replace(/\/?$/, "/")}' not found\n`,
  noHost: (url: string, host: string) =>
    `fatal: unable to access '${url.replace(/\/?$/, "/")}': Could not resolve host: ${host}\n`,
  notARepository: (name: string) =>
    `fatal: '${name}' does not appear to be a git repository
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.
`,
};
