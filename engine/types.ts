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

/** A merge paused on conflicts (`MERGE_HEAD` and `MERGE_MSG`). */
export type MergeOperation = {
  readonly kind: "merge";
  readonly head: Oid;
  readonly message: string;
};

/** A rebase stopped on a conflicting pick (`.git/rebase-merge`). */
export type RebaseOperation = {
  readonly kind: "rebase";
  /** The branch being rebased; null when HEAD was detached. */
  readonly branch: RefName | null;
  /** Where HEAD was before the rebase. */
  readonly head: Oid;
  readonly onto: Oid;
  /** Picks applied so far, the stopped one last. */
  readonly done: readonly Oid[];
  readonly todo: readonly Oid[];
};

export type Operation = MergeOperation | RebaseOperation;

export type Repo = {
  readonly id: RepoId;
  readonly machine: MachineId;
  readonly workdir: string;
  readonly head: Head;
  readonly refs: ReadonlyMap<RefName, Oid>;
  /** Symbolic refs other than HEAD, such as `refs/remotes/origin/HEAD`. */
  readonly symrefs?: ReadonlyMap<RefName, RefName>;
  /** Keyed by `HEAD` or a full ref name. */
  readonly reflogs: ReadonlyMap<string, readonly ReflogEntry[]>;
  readonly index: Index;
  readonly config: ConfigFile;
  /** Commits in the order this repository received them (stable layout). */
  readonly arrival: readonly Oid[];
  /** `ORIG_HEAD`: where HEAD was before the last merge. */
  readonly origHead?: Oid;
  /** The operation in progress, if any. */
  readonly op?: Operation;
  /** `FETCH_HEAD`: what the last fetch brought, as Git writes the file. */
  readonly fetchHead?: string;
  /** A bare repository (no worktree, index or reflogs), as hosted on the Hub. */
  readonly bare?: boolean;
};

export type World = {
  /** Invocations run so far; the clock derives from it. */
  readonly seq: number;
  readonly objects: ObjectPool;
  readonly system: ConfigFile;
  readonly machines: ReadonlyMap<MachineId, Machine>;
  readonly repos: ReadonlyMap<RepoId, Repo>;
  /** Scripted teammates and which of their scripts already acted. */
  readonly actors?: ActorSchedule;
  /** Present when the world has a Hub. */
  readonly hub?: HubState;
  /** The objects each repository has (the pool is shared; transfers move availability). */
  readonly available: ReadonlyMap<RepoId, ReadonlySet<Oid>>;
  /** Set while the last command waits for its editor (ADR-002). */
  readonly pending?: PendingEdit;
};

/** Paths are relative to the machine's home; Git config keys as Git spells them. */
export type MachineSpec = {
  readonly files?: Readonly<Record<string, string>>;
  readonly dirs?: readonly string[];
  readonly cwd?: string;
  readonly global?: Readonly<Record<string, string>>;
};

/** A setup line, run on the learner's machine unless another is named. */
export type SetupStep =
  string | { readonly machine: MachineId; readonly run: string };

/** A protected branch: force pushes and deletions are always refused. */
export type BranchRule = {
  readonly branch: string;
  /** Changes arrive only through pull requests (direct pushes refused). */
  readonly requirePullRequest: boolean;
};

export type HostedRepoSpec = {
  readonly rules?: readonly BranchRule[];
};

/** A repository the Hub hosts, backed by a bare engine repository. */
export type HostedRepo = {
  /** `<owner>/<name>`. */
  readonly fullName: string;
  readonly owner: string;
  readonly repo: RepoId;
  readonly rules: readonly BranchRule[];
  readonly pulls: readonly PullRequest[];
};

/** A pull request: a proposal to merge `head` into `base` in the same repository. */
export type PullRequest = {
  /** Shared with issues: one number sequence per repository. */
  readonly number: number;
  readonly title: string;
  /** Markdown. */
  readonly body: string;
  readonly author: string;
  readonly base: string;
  readonly head: string;
  readonly opened: number;
  readonly state: "open" | "closed" | "merged";
  readonly comments: readonly HubComment[];
  readonly reviews: readonly Review[];
};

/** A conversation comment (Markdown). */
export type HubComment = {
  readonly author: string;
  readonly body: string;
  readonly time: number;
};

export type ReviewState = "commented" | "approved" | "changes-requested";

/** A comment on one line of the head version, as the diff showed it. */
export type LineComment = {
  readonly path: string;
  /** The line's number in the head version at the reviewed commit. */
  readonly line: number;
  readonly body: string;
};

export type Review = {
  readonly author: string;
  readonly state: ReviewState;
  readonly body: string;
  readonly time: number;
  /** The head commit the review saw. */
  readonly commit: Oid;
  readonly comments: readonly LineComment[];
};

/** The Hub's own state (ADR-009); Git data stays in the bare repositories. */
export type HubState = {
  /** Account logins: the learner (`you`), every repository owner and every other machine. */
  readonly accounts: readonly string[];
  readonly repos: ReadonlyMap<string, HostedRepo>;
};

export type GitignoreTemplate = "node" | "python";

/** Something a person (or a scripted teammate) does on the Hub. */
export type HubAction =
  | {
      readonly type: "create-repository";
      readonly name: string;
      readonly readme?: boolean;
      readonly gitignore?: GitignoreTemplate;
      readonly license?: "mit";
    }
  | {
      readonly type: "open-pull-request";
      /** `<owner>/<name>`. */
      readonly repo: string;
      readonly base: string;
      readonly head: string;
      readonly title: string;
      readonly body?: string;
    }
  | {
      readonly type: "comment";
      readonly repo: string;
      readonly number: number;
      readonly body: string;
    }
  | {
      readonly type: "review";
      readonly repo: string;
      readonly number: number;
      readonly state: ReviewState;
      readonly body?: string;
      readonly comments?: readonly LineComment[];
    };

/** A Hub action as an invocation: `actor` is the account that acts. */
export type HubInvocation = {
  readonly kind: "hub";
  readonly actor: string;
  readonly action: HubAction;
};

/** What a Hub action changed on the Hub (Git changes are separate effects). */
export type HubEvent =
  | { readonly type: "repository-created"; readonly repo: string }
  | {
      readonly type: "pull-request-opened";
      readonly repo: string;
      readonly number: number;
      readonly title: string;
    }
  | {
      readonly type: "comment-added";
      readonly repo: string;
      readonly number: number;
    }
  | {
      readonly type: "review-submitted";
      readonly repo: string;
      readonly number: number;
      readonly state: ReviewState;
    };

export type WorldSpec = MachineSpec & {
  readonly system?: Readonly<Record<string, string>>;
  /** Other people's machines (home `/home/<id>`), e.g. a teammate's. */
  readonly machines?: Readonly<Record<MachineId, MachineSpec>>;
  /** Empty repositories hosted on the Hub, keyed `<owner>/<name>`. */
  readonly hub?: Readonly<Record<string, HostedRepoSpec>>;
  /** Commands run once the files exist, e.g. to record earlier commits. */
  readonly setup?: readonly SetupStep[];
  /** Scripted teammates, scheduled once the setup has run. */
  readonly actors?: readonly ActorScript[];
};

/** When a scripted actor acts (each script acts once). */
export type Trigger =
  /** After the learner's `step`-th command in this timeline. */
  | { readonly kind: "after-step"; readonly step: number }
  /** After a learner command whose text matches `pattern` (a regular expression). */
  | { readonly kind: "after-command"; readonly pattern: string }
  /** Once the simulated clock reaches `time` (seconds since the epoch). */
  | { readonly kind: "at-time"; readonly time: number };

/** A teammate's scripted action: lines run in their machine's shell. */
export type ActorScript = {
  readonly id: string;
  /** The machine the lines run on, e.g. `sam`. */
  readonly machine: MachineId;
  /** The name narration and the timeline show, e.g. `Sam`. */
  readonly name: string;
  readonly trigger: Trigger;
  readonly run: readonly string[];
  /** One sentence for "What happened" and the announcer. */
  readonly says?: string;
  /** When it happens, in words for the timeline, e.g. `after you clone`. */
  readonly when?: string;
};

/** The schedule a world carries, and the scripts that already acted (so Rewind undoes them). */
export type ActorSchedule = {
  readonly scripts: readonly ActorScript[];
  readonly fired: readonly string[];
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
  | {
      readonly kind: "actor";
      readonly actor: string;
      /** The script's sentence for narration, on its last command. */
      readonly says?: string;
    }
  | { readonly kind: "hub"; readonly actor: string; readonly event: HubEvent }
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
  | "invalid-ref-name"
  | "branch-exists"
  | "no-such-branch"
  | "branch-checked-out"
  | "not-fully-merged"
  | "unmerged-paths"
  | "operation-in-progress"
  | "no-operation"
  | "no-remote"
  | "no-upstream"
  | "push-rejected"
  | "divergent-branches"
  | "remote-rejected"
  | "hub-refused"
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
