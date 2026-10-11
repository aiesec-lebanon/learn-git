declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A 40-character lowercase SHA-1 object ID. */
export type Oid = Brand<string, "Oid">;
/** A full ref name such as `refs/heads/main`. */
export type RefName = Brand<string, "RefName">;
/** A path relative to a worktree root, `/`-separated, never `.` or `..`. */
export type RepoPath = Brand<string, "RepoPath">;

export type MachineId = string;
export type RepoId = string;

export type Ident = { readonly name: string; readonly email: string };
export type Signature = Ident & { readonly time: number; readonly tz: string };

export type FileMode = "100644" | "100755" | "120000";
export type TreeMode = FileMode | "40000";
export type ObjectType = "blob" | "tree" | "commit";

export type Blob = { readonly type: "blob"; readonly content: string };
export type TreeEntry = {
  readonly mode: TreeMode;
  readonly name: string;
  readonly oid: Oid;
};
export type Tree = {
  readonly type: "tree";
  readonly entries: readonly TreeEntry[];
};
export type Commit = {
  readonly type: "commit";
  readonly tree: Oid;
  readonly parents: readonly Oid[];
  readonly author: Signature;
  readonly committer: Signature;
  readonly message: string;
};
export type GitObject = Blob | Tree | Commit;
export type ObjectPool = ReadonlyMap<Oid, GitObject>;

export type ConfigEntry = {
  readonly key: string;
  readonly value: string | null;
};
export type ConfigFile = readonly ConfigEntry[];
export type ConfigScope = "system" | "global" | "local";

/** Absolute paths on one machine; every file's parent is in `dirs`. */
export type Fs = {
  readonly files: ReadonlyMap<string, string>;
  readonly dirs: ReadonlySet<string>;
};

export type Machine = {
  readonly id: MachineId;
  readonly home: string;
  readonly cwd: string;
  readonly fs: Fs;
  /** `~/.gitconfig`; null while the file does not exist. */
  readonly config: ConfigFile | null;
};

export type Head =
  | { readonly kind: "symbolic"; readonly ref: RefName }
  | { readonly kind: "detached"; readonly oid: Oid };

export type ReflogEntry = {
  readonly old: Oid | null;
  readonly new: Oid | null;
  readonly who: Signature;
  readonly message: string;
};

export type Stage = 0 | 1 | 2 | 3;
export type IndexEntry = {
  readonly path: RepoPath;
  readonly oid: Oid;
  readonly mode: FileMode;
  readonly stage: Stage;
};
/** Entries per path: one at stage 0, or up to three at stages 1 to 3. */
export type Index = ReadonlyMap<RepoPath, readonly IndexEntry[]>;

export type Repo = {
  readonly id: RepoId;
  readonly machine: MachineId;
  readonly workdir: string;
  readonly head: Head;
  readonly refs: ReadonlyMap<RefName, Oid>;
  /** Keyed by `HEAD` or a full ref name. */
  readonly reflogs: ReadonlyMap<string, readonly ReflogEntry[]>;
  readonly index: Index;
  readonly config: ConfigFile;
  /** Commits in the order this repository received them (stable layout). */
  readonly arrival: readonly Oid[];
};

export type World = {
  /** Invocations run so far; the clock derives from it. */
  readonly seq: number;
  readonly objects: ObjectPool;
  readonly system: ConfigFile;
  readonly machines: ReadonlyMap<MachineId, Machine>;
  readonly repos: ReadonlyMap<RepoId, Repo>;
  /** Set while the last command waits for its editor (ADR-002). */
  readonly pending?: PendingEdit;
};

/** Paths are relative to the machine's home; Git config keys as Git spells them. */
export type WorldSpec = {
  readonly files?: Readonly<Record<string, string>>;
  readonly dirs?: readonly string[];
  readonly cwd?: string;
  readonly global?: Readonly<Record<string, string>>;
  readonly system?: Readonly<Record<string, string>>;
  /** Commands run once the files exist, e.g. to record earlier commits. */
  readonly setup?: readonly string[];
};

/** A shell word; `pattern` is set when it has unquoted `*`, `?` or `[`. */
export type Word = { readonly text: string; readonly pattern?: string };
export type Redirect = { readonly op: ">" | ">>"; readonly target: Word };
/** One simple command as the shell parsed it. */
export type Invocation = {
  readonly words: readonly Word[];
  readonly redirect?: Redirect;
  readonly machine?: MachineId;
};

export type PathChange = {
  readonly path: string;
  readonly change: "added" | "modified" | "deleted";
};

export type OperationKind = "merge" | "rebase";
export type OperationPhase =
  "started" | "paused" | "resumed" | "finished" | "aborted";

export type Effect =
  | {
      readonly kind: "repo-created";
      readonly repo: RepoId;
      readonly reinitialized: boolean;
    }
  | {
      readonly kind: "object-written";
      readonly repo: RepoId;
      readonly oid: Oid;
      readonly type: ObjectType;
    }
  | {
      readonly kind: "ref-updated";
      readonly repo: RepoId;
      readonly ref: RefName;
      readonly from: Oid | null;
      readonly to: Oid | null;
    }
  | {
      readonly kind: "head-changed";
      readonly repo: RepoId;
      readonly from: Head;
      readonly to: Head;
    }
  | {
      readonly kind: "index-changed";
      readonly repo: RepoId;
      /** Where the new entries were copied from. */
      readonly from: "worktree" | "commit";
      readonly changes: readonly PathChange[];
    }
  | {
      readonly kind: "files-changed";
      readonly machine: MachineId;
      readonly changes: readonly (PathChange & {
        readonly node: "file" | "dir";
      })[];
    }
  | {
      readonly kind: "config-changed";
      readonly scope: ConfigScope;
      readonly target: MachineId | RepoId;
      readonly key: string;
      readonly from: string | null;
      readonly to: string | null;
    }
  | {
      readonly kind: "cwd-changed";
      readonly machine: MachineId;
      readonly from: string;
      readonly to: string;
    }
  | {
      readonly kind: "operation";
      readonly repo: RepoId;
      readonly operation: OperationKind;
      readonly phase: OperationPhase;
    }
  | {
      readonly kind: "conflict";
      readonly repo: RepoId;
      readonly paths: readonly RepoPath[];
    }
  | {
      readonly kind: "transfer";
      readonly from: RepoId;
      readonly to: RepoId;
      readonly oids: readonly Oid[];
      readonly direction: "fetch" | "push";
    }
  | {
      readonly kind: "refused";
      readonly code: RefusalCode;
      readonly subject?: string;
    }
  | { readonly kind: "actor"; readonly actor: string }
  | { readonly kind: "screen-cleared" };

export type RefusalCode =
  | "unknown-command"
  | "not-simulated"
  | "usage"
  | "not-a-repository"
  | "identity-unknown"
  | "pathspec-no-match"
  | "nothing-to-commit"
  | "empty-message"
  | "unborn-branch"
  | "unknown-revision"
  | "outside-repository"
  | "would-lose-changes"
  | "not-recursive"
  | "not-tracked"
  | "destination-exists"
  | "no-such-directory"
  | "path-ignored"
  | "shell-error";

export type EditorRequest = {
  readonly kind: "editor";
  readonly purpose: "commit-message" | "file";
  /** The file being edited, as the terminal would name it. */
  readonly file: string;
  readonly initial: string;
};

export type InteractionRequest =
  { readonly kind: "open-reference"; readonly entryId: string } | EditorRequest;

/** A command waiting for an editor; `resume` re-runs `argv` with the answer. */
export type PendingEdit = {
  readonly request: EditorRequest;
  readonly argv: readonly string[];
  readonly machine: MachineId;
  readonly cwd: string;
  readonly time: number;
};

export type LineRef = { readonly line: number; readonly oid: Oid };

export type Outcome = {
  readonly world: World;
  readonly output: {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
  };
  readonly effects: readonly Effect[];
  readonly request?: InteractionRequest;
  /** Simulator remarks outside Git's streams (legacy-form notes). */
  readonly notes: readonly string[];
  readonly meta: {
    readonly command: string;
    readonly counted: boolean;
    readonly lines?: readonly LineRef[];
  };
};
