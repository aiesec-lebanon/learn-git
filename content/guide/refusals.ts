import type { RefusalCode } from "@/engine";

/** The guide's one-line translation of each refusal, with the next step. */
export const REFUSAL_GUIDE: Readonly<Record<RefusalCode, string>> = {
  "unknown-command":
    "Git doesn't know that word. Check the spelling; Git lists close matches above when it finds any.",
  "not-simulated":
    "Real Git can do that, but this sandbox doesn't simulate it yet. Type help to see what it covers.",
  usage:
    "An option or argument didn't fit, so Git printed its usage. Compare your line with it.",
  "not-a-repository":
    "This folder isn't a repository, so Git has nowhere to look. Run git init here, or cd into a repository.",
  "identity-unknown":
    "Every commit records an author, and Git doesn't know yours yet. Set it with git config set --global user.name and user.email, then commit again.",
  "pathspec-no-match":
    "No file here matches that path. ls lists the files in this folder.",
  "nothing-to-commit":
    "The staging area already matches the last commit, so there is nothing new to record. Change a file and git add it first.",
  "empty-message":
    "Git stops when a commit has no message. Add one with -m and a short sentence.",
  "unborn-branch":
    "This branch has no commits yet, so there is nothing to show. Make the first commit, then try again.",
  "unknown-revision":
    "Git found no commit and no file by that name. git log --oneline lists the commits you can name, and ls lists the files.",
  "outside-repository":
    "That path is outside this repository, so Git leaves it alone. Use a path inside the repository folder.",
  "would-lose-changes":
    "Git keeps the file because it holds changes no commit has. git rm --cached stops tracking it and keeps your copy; -f removes it anyway.",
  "not-recursive":
    "That path is a folder. Add -r to remove it and every file Git tracks inside.",
  "not-tracked":
    "git mv moves files Git already tracks. git add the file first, or use mv for an untracked one.",
  "destination-exists":
    "Something already has that name. Pick another name; git mv can replace a file with -f.",
  "no-such-directory":
    "git mv doesn't create folders. Make the folder with mkdir first, then move the file.",
  "path-ignored":
    "A .gitignore rule tells Git to leave that path alone. Add -f to track it anyway, or change the rule.",
  "invalid-ref-name":
    "Branch names can't hold spaces, two dots in a row or ~ ^ : ? * [. Use letters, digits, dashes and slashes, like fix/typo.",
  "branch-exists":
    "That name is taken. git branch lists the branches; pick another name or use the one that exists.",
  "no-such-branch":
    "No branch has that name. git branch lists the ones you have.",
  "branch-checked-out":
    "HEAD is on that branch, so Git won't delete or replace it. Switch to another branch first.",
  "not-fully-merged":
    "Deleting that label would leave commits no branch reaches. Merge it first, or use -D if you really want those commits gone.",
  "no-remote":
    "Git couldn't reach that repository. git remote -v lists the remotes and their addresses.",
  "no-upstream":
    "Git doesn't know where this branch goes on the remote yet. Push it once with git push -u origin and the branch name.",
  "remote-rejected":
    "The Hub protects that branch. Push your work to a branch of its own and open a pull request.",
  "push-rejected":
    "Origin has commits you don't have, and this push would remove them. Bring them in with git pull, then push again.",
  "unmerged-paths":
    "Some files still hold conflicts. Edit each one, mark it resolved with git add, then commit. Or run git merge --abort to go back.",
  "operation-in-progress":
    "A merge is paused. Finish it with git commit once every conflict is resolved, or undo it with git merge --abort.",
  "no-operation": "There's no paused merge to continue or abort right now.",
  "shell-error":
    "The shell couldn't run that line. The message above says why.",
};
