export const statusMessages = {
  noCommitsYet: () => "No commits yet",
  stagedTitle: () => "Changes to be committed:",
  unstageUnborn: () => '  (use "git rm --cached <file>..." to unstage)',
  unstage: () => '  (use "git restore --staged <file>..." to unstage)',
  unstagedTitle: () => "Changes not staged for commit:",
  addFile: () => '  (use "git add <file>..." to update what will be committed)',
  addRm: () =>
    '  (use "git add/rm <file>..." to update what will be committed)',
  restore: () =>
    '  (use "git restore <file>..." to discard changes in working directory)',
  untrackedTitle: () => "Untracked files:",
  include: () =>
    '  (use "git add <file>..." to include in what will be committed)',
  ignoredTitle: () => "Ignored files:",
  includeIgnored: () =>
    '  (use "git add -f <file>..." to include in what will be committed)',
  noChangesAdded: () =>
    'no changes added to commit (use "git add" and/or "git commit -a")',
  untrackedOnly: () =>
    'nothing added to commit but untracked files present (use "git add" to track)',
  nothingUnborn: () =>
    'nothing to commit (create/copy files and use "git add" to track)',
  clean: () => "nothing to commit, working tree clean",
  unmergedHere: () => "You have unmerged paths.",
  fixAndCommit: () => '  (fix conflicts and run "git commit")',
  abortMerge: () => '  (use "git merge --abort" to abort the merge)',
  allFixed: () => "All conflicts fixed but you are still merging.",
  concludeMerge: () => '  (use "git commit" to conclude merge)',
  unmergedTitle: () => "Unmerged paths:",
  markAdd: () => '  (use "git add <file>..." to mark resolution)',
  markRm: () => '  (use "git rm <file>..." to mark resolution)',
  markAddRm: () =>
    '  (use "git add/rm <file>..." as appropriate to mark resolution)',
};
