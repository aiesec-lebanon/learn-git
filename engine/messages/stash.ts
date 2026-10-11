export const STASH_USAGE = `usage: git stash list [<log-options>]
   or: git stash show [-u | --include-untracked | --only-untracked] [<diff-options>] [<stash>]
   or: git stash drop [-q | --quiet] [<stash>]
   or: git stash pop [--index] [-q | --quiet] [<stash>]
   or: git stash apply [--index] [-q | --quiet] [<stash>]
   or: git stash branch <branchname> [<stash>]
   or: git stash [push [-p | --patch] [-S | --staged] [-k | --[no-]keep-index] [-q | --quiet]
                 [-u | --include-untracked] [-a | --all] [(-m | --message) <message>]
                 [--pathspec-from-file=<file> [--pathspec-file-nul]]
                 [--] [<pathspec>...]]
   or: git stash save [-p | --patch] [-S | --staged] [-k | --[no-]keep-index] [-q | --quiet]
                 [-u | --include-untracked] [-a | --all] [<message>]
   or: git stash clear
   or: git stash create [<message>]
   or: git stash store [(-m | --message) <message>] [-q | --quiet] <commit>`;

export const stashMessages = {
  noLocalChanges: () => "No local changes to save\n",
  saved: (message: string) =>
    `Saved working directory and index state ${message}\n`,
  noEntries: () => "No stash entries found.\n",
  notValid: (name: string) => `error: ${name} is not a valid reference\n`,
  noInitialCommit: () => "You do not have the initial commit yet\n",
  kept: () => "The stash entry is kept in case you need it again.\n",
  dropped: (name: string, oid: string) => `Dropped ${name} (${oid})\n`,
  needsMerge: (paths: readonly string[]) =>
    paths.map((p) => `${p}: needs merge\n`).join(""),
  couldNotWriteIndex: () => "error: could not write index\n",
  legacySave: (modern: string) => `Older form of: git stash push${modern}`,
  unknownSubcommand: (name: string) => `error: unknown subcommand: ${name}\n`,
};
