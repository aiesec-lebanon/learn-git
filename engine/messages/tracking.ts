const list = (paths: readonly string[]) =>
  paths.map((p) => `    ${p}\n`).join("");

const KEEP = "(use --cached to keep the file, or -f to force removal)\n";

export const rmMessages = {
  removed: (path: string) => `rm '${path}'\n`,
  noPathspec: () =>
    "fatal: No pathspec was given. Which files should I remove?\n",
  notRecursive: (spec: string) =>
    `fatal: not removing '${spec}' recursively without -r\n`,
  stagedDiffers: (paths: readonly string[]) =>
    `error: the following ${paths.length === 1 ? "file has" : "files have"} staged content different from both the\nfile and the HEAD:\n${list(paths)}(use -f to force removal)\n`,
  stagedChanges: (paths: readonly string[]) =>
    `error: the following ${paths.length === 1 ? "file has" : "files have"} changes staged in the index:\n${list(paths)}${KEEP}`,
  localChanges: (paths: readonly string[]) =>
    `error: the following ${paths.length === 1 ? "file has" : "files have"} local modifications:\n${list(paths)}${KEEP}`,
};

export const mvMessages = {
  failed: (reason: string, source: string, destination: string) =>
    `fatal: ${reason}, source=${source}, destination=${destination}\n`,
  notDirectory: (destination: string) =>
    `fatal: destination '${destination}' is not a directory\n`,
  renameFailed: (source: string) =>
    `fatal: renaming '${source}' failed: No such file or directory\n`,
  outside: (spec: string, workdir: string) =>
    `fatal: '${spec}' is outside repository at '${workdir}'\n`,
};
