import { displayRelative } from "../files/paths";
import { quotePath } from "../files/quote";
import { shortRefName } from "../refs/names";
import { statusMessages as m } from "../messages/status";
import { detachedHead } from "../refs/detached";
import type { ObjectPool, Repo } from "../types";
import { compareBytes } from "../util/compare";
import type { FileChange, StatusData, UnmergedCode } from "./compute";
import { collapseIgnored, collapseUntracked } from "./compute";

export type StatusView = {
  readonly data: StatusData;
  readonly repo: Repo;
  readonly pool: ObjectPool;
  /** Where paths are shown from: the cwd, or the worktree root for porcelain. */
  readonly from: string;
  readonly keep: (path: string) => boolean;
  /** `--ignored`: list what `.gitignore` hides too. */
  readonly ignored?: boolean;
};

/** A change as status shows it: staged renames folded in. */
type Entry = {
  readonly kind: FileChange["kind"] | "renamed";
  readonly path: string;
  readonly from?: string;
};

const LABELS: Readonly<Record<Entry["kind"], string>> = {
  renamed: "renamed:",
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

function stagedEntries({ staged, renames }: StatusData): Entry[] {
  const from = new Map<string, string>(renames.map((r) => [r.to, r.from]));
  const gone = new Set<string>(renames.map((r) => r.from));
  return staged
    .filter((c) => !gone.has(c.path))
    .map((c) => {
      const old = from.get(c.path);
      return old === undefined
        ? c
        : { kind: "renamed", path: c.path, from: old };
    });
}

function named(view: StatusView, c: Entry): string {
  const to = shown(view, c.path);
  return c.from === undefined ? to : `${shown(view, c.from)} -> ${to}`;
}

function filtered(view: StatusView) {
  const { data, repo, keep } = view;
  return {
    staged: stagedEntries(data).filter((c) => keep(c.path)),
    unstaged: data.unstaged.filter((c) => keep(c.path)),
    unmerged: data.unmerged.filter((u) => keep(u.path)),
    untracked: collapseUntracked(data.untracked.filter(keep), repo.index),
    ignored: view.ignored
      ? collapseIgnored(data.ignored.filter(keep), data.untracked, repo.index)
      : [],
  };
}

const UNMERGED_LABELS: Readonly<Record<UnmergedCode, string>> = {
  DD: "both deleted:",
  AU: "added by us:",
  UD: "deleted by them:",
  UA: "added by them:",
  DU: "deleted by us:",
  AA: "both added:",
  UU: "both modified:",
};

/** The merge-in-progress lines after the branch line (long format and template). */
function mergeState(view: StatusView, hints: boolean): string[] {
  if (!view.repo.op) return [];
  return view.data.unmerged.length
    ? [m.unmergedHere(), ...(hints ? [m.fixAndCommit(), m.abortMerge()] : [])]
    : [m.allFixed(), ...(hints ? [m.concludeMerge()] : [])];
}

function unmergedHint(codes: readonly UnmergedCode[]): string {
  const deleteModify = codes.some((c) => c === "UD" || c === "DU");
  if (codes.includes("DD") && !deleteModify) return m.markRm();
  return deleteModify || codes.includes("DD") ? m.markAddRm() : m.markAdd();
}

const branchName = (repo: Repo) =>
  repo.head.kind === "symbolic" ? shortRefName(repo.head.ref) : "HEAD";

/** The first status line: the branch, or where HEAD is detached. */
function headLine(view: StatusView): string {
  if (view.repo.head.kind === "symbolic") {
    return `On branch ${branchName(view.repo)}`;
  }
  const detached = detachedHead(view.pool, view.repo);
  return detached
    ? `HEAD detached ${detached.at ? "at" : "from"} ${detached.label}`
    : "Not currently on any branch.";
}

/** `git status` in the long format; `git commit` titles an unborn branch "Initial commit". */
export function longStatus(
  view: StatusView,
  unbornTitle = m.noCommitsYet(),
): string {
  const { staged, unstaged, unmerged, untracked, ignored } = filtered(view);
  const { unborn } = view.data;
  let out = `${headLine(view)}\n`;
  const state = mergeState(view, true);
  if (state.length) out += `${state.join("\n")}\n\n`;
  if (unborn) out += `\n${unbornTitle}\n\n`;
  const entry = (c: Entry) =>
    `\t${LABELS[c.kind].padEnd(12)}${named(view, c)}\n`;
  if (staged.length) {
    const hint = view.repo.op
      ? ""
      : `${unborn ? m.unstageUnborn() : m.unstage()}\n`;
    out += `${m.stagedTitle()}\n${hint}${staged.map(entry).join("")}\n`;
  }
  if (unmerged.length) {
    const label = (code: UnmergedCode) => UNMERGED_LABELS[code].padEnd(17);
    out += `${m.unmergedTitle()}\n${unmergedHint(unmerged.map((u) => u.code))}\n`;
    out += unmerged
      .map((u) => `\t${label(u.code)}${shown(view, u.path)}\n`)
      .join("");
    out += "\n";
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
  if (ignored.length) {
    out += `${m.ignoredTitle()}\n${m.includeIgnored()}\n`;
    out += `${ignored.map((p) => `\t${shown(view, p)}\n`).join("")}\n`;
  }
  if (staged.length) return out;
  if (unstaged.length || unmerged.length) {
    return `${out}${m.noChangesAdded()}\n`;
  }
  if (untracked.length) return `${out}${m.untrackedOnly()}\n`;
  return `${out}${unborn ? m.nothingUnborn() : m.clean()}\n`;
}

const CODES: Readonly<Record<Entry["kind"], string>> = {
  renamed: "R",
  added: "A",
  modified: "M",
  deleted: "D",
};

/** `git status -s` (and porcelain v1, which only differs in where paths start). */
export function shortStatus(view: StatusView, branch: boolean): string {
  const { staged, unstaged, unmerged, untracked, ignored } = filtered(view);
  const header = !branch
    ? ""
    : view.data.unborn
      ? `## No commits yet on ${branchName(view.repo)}\n`
      : view.repo.head.kind === "detached"
        ? "## HEAD (no branch)\n"
        : `## ${branchName(view.repo)}\n`;
  const index = new Map(staged.map((c) => [c.path, c]));
  const tree = new Map(unstaged.map((c) => [c.path as string, c.kind]));
  const conflicts = new Map<string, string>(
    unmerged.map((u) => [u.path, u.code]),
  );
  const paths = [
    ...new Set([...index.keys(), ...tree.keys(), ...conflicts.keys()]),
  ].sort(compareBytes);
  const code = (kind: Entry["kind"] | undefined) => (kind ? CODES[kind] : " ");
  const tracked = paths.map((p) => {
    const conflict = conflicts.get(p);
    if (conflict)
      return `${conflict} ${shown(view, p)}
`;
    const change = index.get(p);
    const name = change ? named(view, change) : shown(view, p);
    return `${code(change?.kind)}${code(tree.get(p))} ${name}\n`;
  });
  const others = [
    ...untracked.map((p) => `?? ${shown(view, p)}\n`),
    ...ignored.map((p) => `!! ${shown(view, p)}\n`),
  ];
  return header + tracked.join("") + others.join("");
}

/** The status Git puts in the commit message template, as `#` comment lines. */
export function commitTemplate(view: StatusView): string {
  const { staged, unstaged, untracked } = filtered(view);
  const entry = (c: Entry) => `\t${LABELS[c.kind].padEnd(12)}${named(view, c)}`;
  const lines = [
    "Please enter the commit message for your changes. Lines starting",
    "with '#' will be ignored, and an empty message aborts the commit.",
    "",
    headLine(view),
  ];
  const state = mergeState(view, false);
  if (state.length) lines.push(...state, "");
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
