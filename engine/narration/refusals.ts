import type { RefusalCode } from "../types";

/** What a refusal means for the sandbox, in plain words (the guide adds next steps). */
export const REFUSAL_FACTS: Readonly<Record<RefusalCode, string>> = {
  "unknown-command": "Git does not know that command.",
  "not-simulated": "The sandbox does not simulate that yet.",
  usage: "Git did not understand the options or arguments.",
  "not-a-repository": "This folder is not inside a Git repository.",
  "identity-unknown":
    "Git needs your name and email before it records a commit.",
  "pathspec-no-match": "No file matched that path.",
  "nothing-to-commit": "The staging area matches the last commit.",
  "empty-message": "A commit needs a message.",
  "unborn-branch": "The branch has no commits yet.",
  "unknown-revision": "Git found no commit or file by that name.",
  "outside-repository": "That path is outside the repository.",
  "would-lose-changes": "Removing the file would lose changes no commit holds.",
  "not-recursive":
    "That path is a folder, and Git removes folders only with -r.",
  "not-tracked": "Git does not track that file.",
  "destination-exists": "Something already has that name.",
  "no-such-directory": "The destination folder does not exist.",
  "path-ignored": "A .gitignore rule hides that path from git add.",
  "invalid-ref-name": "Git does not allow that name for a branch.",
  "branch-exists": "A branch already has that name.",
  "no-such-branch": "No branch has that name.",
  "branch-checked-out": "That branch is the one HEAD is on.",
  "not-fully-merged":
    "The branch holds commits that no other branch or HEAD reaches.",
  "unmerged-paths": "Some files still have unresolved conflicts.",
  "operation-in-progress": "A merge is still in progress.",
  "no-operation": "No merge is in progress.",
  "no-remote": "Git could not reach a repository by that name or address.",
  "no-upstream": "The branch has no upstream branch on the remote yet.",
  "remote-rejected":
    "The Hub's rules refused the push, so nothing moved there.",
  "push-rejected":
    "The remote has commits the push would remove, so nothing moved there.",
  "shell-error": "The shell could not run that line.",
};
