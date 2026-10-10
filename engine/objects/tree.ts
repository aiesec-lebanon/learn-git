import type {
  FileMode,
  ObjectPool,
  Oid,
  RepoPath,
  Tree,
  TreeEntry,
} from "../types";
import { compareBytes } from "../util/compare";
import { hashObject } from "./hash";
import { readObject } from "./pool";

export type TreeFile = { readonly oid: Oid; readonly mode: FileMode };

const sortName = (e: TreeEntry) => (e.mode === "40000" ? `${e.name}/` : e.name);

export function sortTreeEntries(entries: readonly TreeEntry[]): TreeEntry[] {
  return [...entries].sort((a, b) => compareBytes(sortName(a), sortName(b)));
}

/** Builds the trees for a flat list of files; returns the root ID and every tree object. */
export function buildTree(files: ReadonlyMap<RepoPath, TreeFile>): {
  root: Oid;
  trees: readonly Tree[];
} {
  const trees: Tree[] = [];
  const build = (paths: readonly [string, TreeFile][]): Oid => {
    const entries: TreeEntry[] = [];
    const folders = new Map<string, [string, TreeFile][]>();
    for (const [path, file] of paths) {
      const cut = path.indexOf("/");
      if (cut < 0) {
        entries.push({ mode: file.mode, name: path, oid: file.oid });
      } else {
        const name = path.slice(0, cut);
        const list = folders.get(name) ?? [];
        list.push([path.slice(cut + 1), file]);
        folders.set(name, list);
      }
    }
    for (const [name, list] of folders) {
      entries.push({ mode: "40000", name, oid: build(list) });
    }
    const tree: Tree = { type: "tree", entries: sortTreeEntries(entries) };
    trees.push(tree);
    return hashObject(tree);
  };
  return { root: build([...files]), trees };
}

const flatMemo = new WeakMap<Tree, ReadonlyMap<RepoPath, TreeFile>>();

/** Every file in a tree by full path. */
export function flattenTree(
  pool: ObjectPool,
  oid: Oid,
): ReadonlyMap<RepoPath, TreeFile> {
  const tree = readObject(pool, oid, "tree");
  const cached = flatMemo.get(tree);
  if (cached) return cached;
  const out = new Map<RepoPath, TreeFile>();
  for (const entry of tree.entries) {
    if (entry.mode === "40000") {
      for (const [path, file] of flattenTree(pool, entry.oid)) {
        out.set(`${entry.name}/${path}` as RepoPath, file);
      }
    } else {
      out.set(entry.name as RepoPath, { oid: entry.oid, mode: entry.mode });
    }
  }
  flatMemo.set(tree, out);
  return out;
}
