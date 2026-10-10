export const addMessages = {
  nothingSpecified: () =>
    `Nothing specified, nothing added.
hint: Maybe you wanted to say 'git add .'?
hint: Disable this message with "git config advice.addEmptyPathspec false"
`,
  noMatch: (spec: string) =>
    `fatal: pathspec '${spec}' did not match any files\n`,
  outside: (spec: string, workdir: string) =>
    `fatal: ${spec}: '${spec}' is outside repository at '${workdir}'\n`,
  incompatible: (a: string, b: string) =>
    `fatal: options '${a}' and '${b}' cannot be used together\n`,
};
