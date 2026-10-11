export const CLONE_USAGE = "usage: git clone [<options>] [--] <repo> [<dir>]";

export const cloneMessages = {
  cloningInto: (dir: string) => `Cloning into '${dir}'...\n`,
  empty: () => "warning: You appear to have cloned an empty repository.\n",
  noRepository: () =>
    `fatal: You must specify a repository to clone.\n\n${CLONE_USAGE}\n\n`,
  tooMany: () => `fatal: Too many arguments.\n\n${CLONE_USAGE}\n\n`,
  destinationExists: (dir: string) =>
    `fatal: destination path '${dir}' already exists and is not an empty directory.\n`,
  doesNotExist: (path: string) =>
    `fatal: repository '${path}' does not exist\n`,
  remoteHeadMissing: () =>
    "warning: remote HEAD refers to nonexistent ref, unable to checkout\n",
};
