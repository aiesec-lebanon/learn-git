const SEPARATE = `Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
`;

export const revisionMessages = {
  unknown: (arg: string) =>
    `fatal: ambiguous argument '${arg}': unknown revision or path not in the working tree.\n${SEPARATE}`,
  both: (arg: string) =>
    `fatal: ambiguous argument '${arg}': both revision and filename\n${SEPARATE}`,
  noSuchPath: (arg: string) =>
    `fatal: ${arg}: no such path in the working tree.\nUse 'git <command> -- <path>...' to specify paths that do not exist locally.\n`,
  badRevision: (arg: string) => `fatal: bad revision '${arg}'\n`,
  badObject: (arg: string) => `fatal: bad object ${arg}\n`,
  ambiguousId: (arg: string) => `error: short object ID ${arg} is ambiguous\n`,
};
