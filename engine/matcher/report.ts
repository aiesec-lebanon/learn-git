import type { FileExpectation, PathState } from "./target";

const STATE_TEXT: Readonly<Record<PathState, string>> = {
  unmodified: "unchanged since the last commit",
  staged: "staged",
  modified: "modified and not staged",
  "staged-and-modified": "staged and modified again",
  untracked: "untracked",
  ignored: "ignored",
  absent: "absent",
};

const expectText = (e: FileExpectation) =>
  e === null ? "be absent" : e === true ? "exist" : "have the target content";

/** Plain-language differences; every subject is named as the target names it. */
export const report = {
  noRepository: (folder: string) =>
    `There is no Git repository in ${folder} yet.`,
  branchMissing: (branch: string) => `The branch ${branch} does not exist yet.`,
  branchExtra: (branch: string) => `The branch ${branch} should not exist.`,
  remoteBranchMissing: (remote: string, branch: string) =>
    `${remote} has no branch ${branch} yet.`,
  remoteBranchExtra: (remote: string, branch: string) =>
    `${remote} should not have a branch ${branch}.`,
  noCommit: (name: string) => `No commit matches ${name} yet.`,
  sameCommit: (a: string, b: string) =>
    `${a} and ${b} should be different commits.`,
  anchorConflict: (name: string) =>
    `${name} is reached through two different commits.`,
  parentCount: (name: string, want: number, got: number) =>
    want === 0
      ? `${name} should be a first commit (no parent); it has ${got}.`
      : `${name} should have ${want} parent${want === 1 ? "" : "s"}; it has ${got}.`,
  commitFile: (name: string, path: string, want: FileExpectation) =>
    `In ${name}, ${path} should ${expectText(want)}.`,
  message: (name: string, want: string) =>
    `${name} should have the message "${want}".`,
  commitCount: (want: number, got: number) =>
    `The history should have ${want} commit${want === 1 ? "" : "s"}; it has ${got}.`,
  headBranch: (branch: string) => `HEAD should point at ${branch}.`,
  headDetached: (name: string) => `HEAD should be detached at ${name}.`,
  pathState: (path: string, want: PathState, got: PathState) =>
    `${path} should be ${STATE_TEXT[want]}; it is ${STATE_TEXT[got]}.`,
  notClean: (paths: readonly string[]) =>
    `The working tree should be clean; ${paths.join(", ")} still differ${paths.length === 1 ? "s" : ""}.`,
  worktreeFile: (path: string, want: FileExpectation) =>
    `In the working tree, ${path} should ${expectText(want)}.`,
  config: (key: string, want: string | null) =>
    want === null
      ? `${key} should not be set.`
      : `${key} should be set to "${want}".`,
};
