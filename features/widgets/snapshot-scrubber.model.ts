/** Four commits of the recipe site, each a snapshot of the whole folder. */
const HISTORY = [
  { message: "Add the home page", files: { "index.html": 1 } },
  { message: "Add a README", files: { "index.html": 1, "README.md": 1 } },
  {
    message: "Add the soup recipe",
    files: { "index.html": 1, "README.md": 1, "soup.html": 1 },
  },
  {
    message: "Link the soup page",
    files: { "index.html": 2, "README.md": 1, "soup.html": 1 },
  },
] as const satisfies readonly {
  message: string;
  files: Readonly<Record<string, number>>;
}[];

export type SnapshotFile = {
  readonly path: string;
  readonly change: "added" | "changed" | null;
};

export type Snapshot = {
  readonly message: string;
  readonly files: readonly SnapshotFile[];
};

export const SNAPSHOT_COUNT = HISTORY.length;

/** Snapshot `index` (0-based): every file, marked against the snapshot before it. */
export function snapshotAt(index: number): Snapshot {
  const at = Math.min(Math.max(index, 0), HISTORY.length - 1);
  const now: Readonly<Record<string, number>> = HISTORY[at]?.files ?? {};
  const before: Readonly<Record<string, number>> =
    at > 0 ? (HISTORY[at - 1]?.files ?? {}) : {};
  return {
    message: HISTORY[at]?.message ?? "",
    files: Object.keys(now)
      .sort()
      .map((path) => ({
        path,
        change:
          before[path] === undefined
            ? "added"
            : before[path] !== now[path]
              ? "changed"
              : null,
      })),
  };
}

export const snapshotText = (index: number): string =>
  `Snapshot ${index + 1} of ${SNAPSHOT_COUNT}: ${snapshotAt(index).message}`;
