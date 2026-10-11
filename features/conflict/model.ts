import {
  abbreviate,
  discoverRepo,
  subjectOf,
  type Operation,
  displayRelative,
  machineOf,
  resolvePath,
  worktreeFiles,
  type World,
} from "@/engine";

/** One conflict region as Git wrote it, in any of the three marker styles. */
export type Hunk = {
  readonly kind: "hunk";
  readonly ours: string;
  /** Null in the default "merge" style, which leaves the base out. */
  readonly base: string | null;
  readonly theirs: string;
  readonly labels: {
    readonly ours: string;
    readonly base: string | null;
    readonly theirs: string;
  };
  readonly raw: string;
};

export type Segment = { readonly kind: "text"; readonly text: string } | Hunk;

export type Choice = "ours" | "theirs" | "both";

const MARKS = { open: "<", base: "|", split: "=", close: ">" } as const;
type Mark = keyof typeof MARKS;

const markOf = (line: string): Mark | null => {
  for (const [mark, ch] of Object.entries(MARKS) as [Mark, string][]) {
    if (!line.startsWith(ch.repeat(7))) continue;
    const next = line[7];
    if (next === undefined || next === " " || next === "\n") return mark;
  }
  return null;
};

const labelOf = (line: string) => line.slice(8).replace(/\n$/, "");

const linesOf = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

/** Splits a file into plain text and conflict hunks; a broken hunk stays text. */
export function parseConflicts(text: string): Segment[] {
  const segments: Segment[] = [];
  let plain = "";
  type Open = {
    part: "ours" | "base" | "theirs";
    ours: string;
    base: string | null;
    theirs: string;
    labels: { ours: string; base: string | null; theirs: string };
    raw: string;
  };
  let open: Open | null = null;
  const flush = () => {
    if (plain) segments.push({ kind: "text", text: plain });
    plain = "";
  };
  for (const line of linesOf(text)) {
    const mark = markOf(line);
    if (!open) {
      if (mark === "open") {
        open = {
          part: "ours",
          ours: "",
          base: null,
          theirs: "",
          labels: { ours: labelOf(line), base: null, theirs: "" },
          raw: line,
        };
      } else plain += line;
      continue;
    }
    open.raw += line;
    if (mark === "base" && open.part === "ours") {
      open.part = "base";
      open.base = "";
      open.labels.base = labelOf(line);
    } else if (mark === "split" && open.part !== "theirs") {
      open.part = "theirs";
    } else if (mark === "close" && open.part === "theirs") {
      open.labels.theirs = labelOf(line);
      flush();
      const { ours, base, theirs, labels, raw } = open;
      segments.push({ kind: "hunk", ours, base, theirs, labels, raw });
      open = null;
    } else if (open.part === "base") open.base += line;
    else open[open.part] += line;
  }
  if (open) plain += open.raw;
  flush();
  return segments;
}

export const hunksOf = (segments: readonly Segment[]) =>
  segments.filter((s): s is Hunk => s.kind === "hunk");

const withNewline = (text: string) =>
  text === "" || text.endsWith("\n") ? text : `${text}\n`;

/** The text a choice puts in place of the hunk. */
export function chosenText(hunk: Hunk, choice: Choice): string {
  if (choice === "ours") return hunk.ours;
  if (choice === "theirs") return hunk.theirs;
  return withNewline(hunk.ours) + hunk.theirs;
}

/** The file with hunk `index` replaced by `text` and every other hunk as written. */
export function replaceHunk(
  segments: readonly Segment[],
  index: number,
  text: string,
): string {
  let n = -1;
  return segments
    .map((s) => {
      if (s.kind === "text") return s.text;
      n += 1;
      return n === index ? text : s.raw;
    })
    .join("");
}

/** 1-based line numbers that still look like conflict markers. */
export function markerLines(text: string): number[] {
  return linesOf(text).flatMap((line, i) => {
    const mark = markOf(line);
    return mark && mark !== "base" ? [i + 1] : [];
  });
}

export type ConflictFile = {
  /** Path from the repository root, as status prints it. */
  readonly path: string;
  /** The same file as a command argument from the current folder. */
  readonly arg: string;
  readonly text: string | null;
};

export type PausedMerge = {
  /** A merge, or a rebase stopped on one of its picks. */
  readonly kind: "merge" | "rebase";
  /** The merge message's first line, or the stopped pick (`743d676 Mine`). */
  readonly message: string;
  /** Unmerged paths, in index order. */
  readonly files: readonly ConflictFile[];
};

/** Plain names for the two sides; a rebase replays your commit onto the other side. */
export const SIDES = {
  merge: { ours: "the branch you are on", theirs: "the branch merged in" },
  rebase: {
    ours: "the new base you are replaying onto",
    theirs: "your commit being replayed",
  },
} as const;

function opMessage(world: World, op: Operation): string {
  if (op.kind === "merge") return op.message.split("\n")[0] ?? "";
  const stopped = op.done.at(-1);
  const commit = stopped ? world.objects.get(stopped) : undefined;
  return stopped && commit?.type === "commit"
    ? `${abbreviate(world.objects, stopped)} ${subjectOf(commit.message)}`
    : "";
}

/** The merge or rebase paused in the current folder's repository, or null. */
export function pausedMerge(world: World): PausedMerge | null {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  const op = repo?.op;
  if (!repo || !op) return null;
  const tree = worktreeFiles(machine.fs, repo.workdir);
  const files = [...repo.index]
    .filter(([, entries]) => entries.some((e) => e.stage > 0))
    .map(([path]) => ({
      path,
      arg: displayRelative(machine.cwd, resolvePath(repo.workdir, path)),
      text: tree.get(path) ?? null,
    }));
  return { kind: op.kind, message: opMessage(world, op), files };
}
