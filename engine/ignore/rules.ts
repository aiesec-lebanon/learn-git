import { compileName, compilePath } from "./wildmatch";

type Rule = {
  readonly negate: boolean;
  readonly dirOnly: boolean;
  /** A slash before the end ties the pattern to its file's folder; otherwise it matches names. */
  readonly anchored: boolean;
  readonly test: (path: string) => boolean;
};

function trimTrailingSpaces(line: string): string {
  let end = line.length;
  while (end > 0 && line[end - 1] === " " && line[end - 2] !== "\\") end--;
  return line.slice(0, end);
}

/** The rules of one `.gitignore`: blank lines and `#` comments skipped, `!` negates, `/` anchors. */
export function parseIgnoreFile(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split("\n")) {
    let line = trimTrailingSpaces(raw.endsWith("\r") ? raw.slice(0, -1) : raw);
    if (line === "" || line.startsWith("#")) continue;
    const negate = line.startsWith("!");
    if (negate) line = line.slice(1);
    const dirOnly = line.endsWith("/");
    if (dirOnly) line = line.slice(0, -1);
    const anchored = line.includes("/");
    if (line.startsWith("/")) line = line.slice(1);
    if (line === "") continue;
    rules.push({
      negate,
      dirOnly,
      anchored,
      test: anchored ? compilePath(line) : compileName(line),
    });
  }
  return rules;
}

const folderOf = (path: string) => {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut);
};

export type IgnoreRules = {
  /** Whether Git ignores this worktree path: its own match, or a folder above it excluded. */
  readonly ignored: (path: string, isDir?: boolean) => boolean;
};

/**
 * `.gitignore` rules read from the worktree files (repository paths). The
 * last matching line wins and deeper files override shallower ones; nothing
 * under an excluded folder can be re-included, and its own `.gitignore` is never read.
 */
export function ignoreRules(files: ReadonlyMap<string, string>): IgnoreRules {
  const byFolder = new Map<string, readonly Rule[]>();
  const rulesIn = (folder: string) => {
    let rules = byFolder.get(folder);
    if (!rules) {
      const text = files.get(folder ? `${folder}/.gitignore` : ".gitignore");
      rules = text === undefined ? [] : parseIgnoreFile(text);
      byFolder.set(folder, rules);
    }
    return rules;
  };

  const ownMatch = (path: string, isDir: boolean): boolean => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    for (let folder = folderOf(path); ; folder = folderOf(folder)) {
      const rel = folder ? path.slice(folder.length + 1) : path;
      const rules = rulesIn(folder);
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i] as Rule;
        if (rule.dirOnly && !isDir) continue;
        if (rule.test(rule.anchored ? rel : name)) return !rule.negate;
      }
      if (folder === "") return false;
    }
  };

  const excludedDirs = new Map<string, boolean>();
  const dirExcluded = (dir: string): boolean => {
    let excluded = excludedDirs.get(dir);
    if (excluded === undefined) {
      const parent = folderOf(dir);
      excluded = (parent !== "" && dirExcluded(parent)) || ownMatch(dir, true);
      excludedDirs.set(dir, excluded);
    }
    return excluded;
  };

  return {
    ignored: (path, isDir = false) => {
      const parent = folderOf(path);
      return (parent !== "" && dirExcluded(parent)) || ownMatch(path, isDir);
    },
  };
}
