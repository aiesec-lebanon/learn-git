import { displayRelative } from "../files/paths";
import { quotePath } from "../files/quote";
import { shortRefName } from "../refs/names";
import { statusMessages as m } from "../messages/status";
import type { Repo } from "../types";
import { compareBytes } from "../util/compare";
import type { FileChange, StatusData } from "./compute";
import { collapseUntracked } from "./compute";

export type StatusView = {
  readonly data: StatusData;
  readonly repo: Repo;
  /** Where paths are shown from: the cwd, or the worktree root for porcelain. */
  readonly from: string;
  readonly keep: (path: string) => boolean;
};

const LABELS: Readonly<Record<FileChange["kind"], string>> = {
  added: "new file:",
  modified: "modified:",
  deleted: "deleted:",
};

function shown(view: StatusView, path: string): string {
  const dir = path.endsWith("/");
  const absolute = `${view.repo.workdir}/${dir ? path.slice(0, -1) : path}`;
  const relative = displayRelative(view.from, absolute);
  const text = dir ? (relative === "" ? "./" : `${relative}/`) : relative;
  return quotePath(text);
}

function filtered(view: StatusView) {
  const { data, repo, keep } = view;
  return {
    staged: data.staged.filter((c) => keep(c.path)),
    unstaged: data.unstaged.filter((c) => keep(c.path)),
    untracked: collapseUntracked(data.untracked.filter(keep), repo.index),
  };
}

const branchName = (repo: Repo) =>
  repo.head.kind === "symbolic" ? shortRefName(repo.head.ref) : "HEAD";

/** `git status` in the long format; `git commit` titles an unborn branch "Initial commit". */
export function longStatus(
  view: StatusView,
  unbornTitle = m.noCommitsYet(),
): string {
  const { staged, unstaged, untracked } = filtered(view);
  const { unborn } = view.data;
  let out = `On branch ${branchName(view.repo)}\n`;
  if (unborn) out += `\n${unbornTitle}\n\n`;
  const entry = (c: FileChange) =>
    `\t${LABELS[c.kind].padEnd(12)}${shown(view, c.path)}\n`;
  if (staged.length) {
    out += `${m.stagedTitle()}\n${unborn ? m.unstageUnborn() : m.unstage()}\n`;
    out += `${staged.map(entry).join("")}\n`;
  }
  if (unstaged.length) {
    const deletions = unstaged.some((c) => c.kind === "deleted");
    out += `${m.unstagedTitle()}\n${deletions ? m.addRm() : m.addFile()}\n${m.restore()}\n`;
    out += `${unstaged.map(entry).join("")}\n`;
  }
  if (untracked.length) {
    out += `${m.untrackedTitle()}\n${m.include()}\n`;
    out += `${untracked.map((p) => `\t${shown(view, p)}\n`).join("")}\n`;
  }
  if (staged.length) return out;
  if (unstaged.length) return `${out}${m.noChangesAdded()}\n`;
  if (untracked.length) return `${out}${m.untrackedOnly()}\n`;
  return `${out}${unborn ? m.nothingUnborn() : m.clean()}\n`;
}

const CODES: Readonly<Record<FileChange["kind"], string>> = {
  added: "A",
  modified: "M",
  deleted: "D",
};

/** `git status -s` (and porcelain v1, which only differs in where paths start). */
export function shortStatus(view: StatusView, branch: boolean): string {
  const { staged, unstaged, untracked } = filtered(view);
  const header = !branch
    ? ""
    : view.data.unborn
      ? `## No commits yet on ${branchName(view.repo)}\n`
      : `## ${branchName(view.repo)}\n`;
  const index = new Map(staged.map((c) => [c.path as string, c.kind]));
  const tree = new Map(unstaged.map((c) => [c.path as string, c.kind]));
  const paths = [...new Set([...index.keys(), ...tree.keys()])].sort(
    compareBytes,
  );
  const code = (kind: FileChange["kind"] | undefined) =>
    kind ? CODES[kind] : " ";
  const tracked = paths.map(
    (p) => `${code(index.get(p))}${code(tree.get(p))} ${shown(view, p)}\n`,
  );
  const others = untracked.map((p) => `?? ${shown(view, p)}\n`);
  return header + tracked.join("") + others.join("");
}

/** The status Git puts in the commit message template, as `#` comment lines. */
export function commitTemplate(view: StatusView): string {
  const { staged, unstaged, untracked } = filtered(view);
  const entry = (c: FileChange) =>
    `\t${LABELS[c.kind].padEnd(12)}${shown(view, c.path)}`;
  const lines = [
    "Please enter the commit message for your changes. Lines starting",
    "with '#' will be ignored, and an empty message aborts the commit.",
    "",
    `On branch ${branchName(view.repo)}`,
  ];
  if (view.data.unborn) lines.push("", "Initial commit", "");
  const section = (title: string, entries: readonly string[]) => {
    if (entries.length) lines.push(title, ...entries, "");
  };
  section(m.stagedTitle(), staged.map(entry));
  section(m.unstagedTitle(), unstaged.map(entry));
  section(
    m.untrackedTitle(),
    untracked.map((p) => `\t${shown(view, p)}`),
  );
  const comment = (line: string) =>
    line === "" ? "#" : line.startsWith("\t") ? `#${line}` : `# ${line}`;
  return `\n${lines.map(comment).join("\n")}\n`;
}
