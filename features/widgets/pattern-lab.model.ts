import { ignoreRules } from "@/engine";
import type { FileCard, StageFiles } from "@/features/stage/files";

export const LAB_START = "*.log\ndist/\n!keep.log\n";

/** The lab's sample folder; tracked files show that rules leave them alone. */
export const LAB_FILES: readonly { path: string; tracked: boolean }[] = [
  { path: ".env", tracked: true },
  { path: "README.md", tracked: true },
  { path: "app.log", tracked: false },
  { path: "dist/menu.min.html", tracked: false },
  { path: "dist/style.min.css", tracked: false },
  { path: "keep.log", tracked: false },
  { path: "logs/debug.log", tracked: false },
  { path: "notes.txt", tracked: false },
];

export type LabRow = {
  readonly path: string;
  readonly tracked: boolean;
  /** A rule names the file. */
  readonly matched: boolean;
  /** Git hides it: matched and not tracked. */
  readonly ignored: boolean;
};

/** Each sample file against the typed `.gitignore` text, using the engine's matcher. */
export function labRows(patterns: string): readonly LabRow[] {
  const rules = ignoreRules(new Map([[".gitignore", patterns]]));
  return LAB_FILES.map(({ path, tracked }) => {
    const matched = rules.ignored(path);
    return { path, tracked, matched, ignored: matched && !tracked };
  });
}

export type StateGroup = {
  readonly id: "untracked" | "tracked" | "ignored";
  readonly title: string;
  readonly files: readonly (FileCard & { readonly staged: boolean })[];
};

/** The sandbox's files sorted into untracked, tracked and ignored; tracked ones say whether a change is staged. */
export function stateGroups(files: StageFiles): readonly StateGroup[] | null {
  if (!files.index) return null;
  const staged = new Set(
    files.index
      .filter((f) => f.state !== null && f.state !== "unmodified")
      .map((f) => f.path),
  );
  const cards = files.worktree.map((f) => ({
    ...f,
    staged: staged.has(f.path),
  }));
  const shown = new Set(cards.map((f) => f.path));
  for (const f of files.index)
    if (!shown.has(f.path) && staged.has(f.path))
      cards.push({ path: f.path, state: f.state, staged: true });
  const pick = (test: (f: FileCard) => boolean) => cards.filter(test);
  return [
    {
      id: "untracked",
      title: "Untracked",
      files: pick((f) => f.state === "untracked"),
    },
    {
      id: "tracked",
      title: "Tracked",
      files: pick((f) => f.state !== "untracked" && f.state !== "ignored"),
    },
    {
      id: "ignored",
      title: "Ignored",
      files: pick((f) => f.state === "ignored"),
    },
  ];
}
