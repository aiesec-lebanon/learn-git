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
  ignored: (paths: readonly string[]) =>
    `The following paths are ignored by one of your .gitignore files:
${paths
  .map(
    (p) => `${p}
`,
  )
  .join("")}hint: Use -f if you really want to add them.
hint: Disable this message with "git config advice.addIgnoredFile false"
`,
  incompatible: (a: string, b: string) =>
    `fatal: options '${a}' and '${b}' cannot be used together\n`,
};
