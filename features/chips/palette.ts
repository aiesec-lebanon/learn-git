import {
  discoverRepo,
  displayRelative,
  listDir,
  machineOf,
  resolveHead,
  type World,
} from "@/engine";
import { stageFiles } from "@/features/stage/files";

/** What a path parameter offers: changed files, files or folders here. */
export type PathPick = "changed" | "files" | "dirs";

export type Param =
  | { readonly kind: "flag"; readonly flag: string; readonly label: string }
  | {
      readonly kind: "value";
      readonly label: string;
      readonly flag?: string;
      readonly required?: boolean;
      readonly choices?: readonly string[];
    }
  | {
      readonly kind: "paths";
      readonly label: string;
      readonly pick: PathPick;
      readonly single?: boolean;
      readonly required?: boolean;
    };

export type ChipState = {
  readonly repo: boolean;
  readonly commits: boolean;
  /** Working-tree changes `git add` can stage. */
  readonly changed: boolean;
  /** Staged changes `git commit` can record. */
  readonly staged: boolean;
  readonly files: boolean;
};

export type ChipVerb = {
  readonly program: "git" | "shell";
  readonly name: string;
  readonly hint: string;
  readonly params: readonly Param[];
  readonly ready: (state: ChipState) => boolean;
};

const always = () => true;
const inRepo = (s: ChipState) => s.repo;

/** Chip-expressible commands, in teaching order; flags must exist in the command definitions. */
export const VERBS: readonly ChipVerb[] = [
  {
    program: "git",
    name: "init",
    hint: "start a repository here",
    params: [],
    ready: (s) => !s.repo,
  },
  {
    program: "git",
    name: "config",
    hint: "set your name or email",
    params: [
      { kind: "flag", flag: "--global", label: "for every repository" },
      {
        kind: "value",
        label: "setting",
        required: true,
        choices: ["user.name", "user.email"],
      },
      { kind: "value", label: "value" },
    ],
    ready: always,
  },
  {
    program: "git",
    name: "status",
    hint: "see what changed",
    params: [{ kind: "flag", flag: "--short", label: "short" }],
    ready: inRepo,
  },
  {
    program: "git",
    name: "add",
    hint: "stage changes",
    params: [
      { kind: "flag", flag: "--all", label: "everything" },
      { kind: "paths", label: "files", pick: "changed" },
    ],
    ready: (s) => s.repo && s.changed,
  },
  {
    program: "git",
    name: "commit",
    hint: "save the staged snapshot",
    params: [{ kind: "value", flag: "-m", label: "message", required: true }],
    ready: (s) => s.repo && s.staged,
  },
  {
    program: "git",
    name: "log",
    hint: "list commits",
    params: [
      { kind: "flag", flag: "--oneline", label: "one line each" },
      { kind: "value", flag: "-n", label: "how many" },
    ],
    ready: (s) => s.commits,
  },
  {
    program: "git",
    name: "diff",
    hint: "see changed lines",
    params: [
      { kind: "flag", flag: "--staged", label: "staged changes" },
      { kind: "flag", flag: "--stat", label: "summary only" },
    ],
    ready: (s) => s.repo && (s.changed || s.staged),
  },
  {
    program: "git",
    name: "restore",
    hint: "undo changes to files",
    params: [
      { kind: "flag", flag: "--staged", label: "unstage instead" },
      { kind: "paths", label: "files", pick: "changed", required: true },
    ],
    ready: (s) => s.repo && (s.changed || s.staged),
  },
  {
    program: "git",
    name: "show",
    hint: "show the last commit",
    params: [{ kind: "flag", flag: "--stat", label: "summary only" }],
    ready: (s) => s.commits,
  },
  {
    program: "shell",
    name: "ls",
    hint: "list files",
    params: [],
    ready: always,
  },
  {
    program: "shell",
    name: "cat",
    hint: "show a file",
    params: [
      {
        kind: "paths",
        label: "file",
        pick: "files",
        single: true,
        required: true,
      },
    ],
    ready: (s) => s.files,
  },
  {
    program: "shell",
    name: "cd",
    hint: "change folder",
    params: [
      {
        kind: "paths",
        label: "folder",
        pick: "dirs",
        single: true,
        required: true,
      },
    ],
    ready: always,
  },
  {
    program: "shell",
    name: "pwd",
    hint: "where am I?",
    params: [],
    ready: always,
  },
  {
    program: "shell",
    name: "mkdir",
    hint: "make a folder",
    params: [{ kind: "value", label: "folder name", required: true }],
    ready: always,
  },
  {
    program: "shell",
    name: "touch",
    hint: "make an empty file",
    params: [{ kind: "value", label: "file name", required: true }],
    ready: always,
  },
  {
    program: "shell",
    name: "edit",
    hint: "write file",
    params: [{ kind: "value", label: "file name", required: true }],
    ready: always,
  },
  {
    program: "shell",
    name: "mv",
    hint: "rename a file",
    params: [
      {
        kind: "paths",
        label: "file",
        pick: "files",
        single: true,
        required: true,
      },
      { kind: "value", label: "new name", required: true },
    ],
    ready: (s) => s.files,
  },
  {
    program: "shell",
    name: "rm",
    hint: "delete files",
    params: [{ kind: "paths", label: "files", pick: "files", required: true }],
    ready: (s) => s.files,
  },
  {
    program: "shell",
    name: "clear",
    hint: "clear the terminal",
    params: [],
    ready: always,
  },
];

export function chipState(world: World): ChipState {
  const machine = machineOf(world);
  const repo = discoverRepo(world, machine);
  const stage = stageFiles(world);
  return {
    repo: repo !== null,
    commits: repo !== null && resolveHead(repo) !== null,
    changed: stage.worktree.some((f) => f.state && f.state !== "unmodified"),
    staged: (stage.index ?? []).some(
      (f) => f.state && f.state !== "unmodified",
    ),
    files: listDir(machine.fs, machine.cwd).some((e) => !e.dir),
  };
}

/** Valid verbs first, each group in teaching order. */
export function rank(state: ChipState): readonly ChipVerb[] {
  return [
    ...VERBS.filter((v) => v.ready(state)),
    ...VERBS.filter((v) => !v.ready(state)),
  ];
}

/** Candidates for a path parameter, relative to the current folder. */
export function pathChoices(world: World, pick: PathPick): readonly string[] {
  const machine = machineOf(world);
  if (pick === "changed") {
    const stage = stageFiles(world);
    const changed = stage.worktree
      .filter((f) => f.state && f.state !== "unmodified")
      .map((f) => displayRelative(machine.cwd, `${stage.root}/${f.path}`));
    return changed.length ? [".", ...changed] : [];
  }
  const entries = listDir(machine.fs, machine.cwd).filter(
    (e) => e.name !== ".git" && e.dir === (pick === "dirs"),
  );
  const names = entries.map((e) => e.name);
  return pick === "dirs" && machine.cwd !== "/" ? ["..", ...names] : names;
}
