import type { ConfigFile, Effect, Head, World } from "../types";

const headKey = (h: Head) => (h.kind === "symbolic" ? h.ref : h.oid);

function configKeys(
  out: Set<string>,
  scope: string,
  target: string,
  before: ConfigFile,
  after: ConfigFile,
) {
  const last = (file: ConfigFile, key: string) =>
    file.filter((e) => e.key === key).at(-1)?.value;
  const keys = new Set([...before, ...after].map((e) => e.key));
  for (const key of keys) {
    const to = last(after, key);
    if (last(before, key) !== to) {
      out.add(`config ${scope} ${target} ${key} ${to ?? "(unset)"}`);
    }
  }
}

function mapDiff<K, V>(
  before: ReadonlyMap<K, V>,
  after: ReadonlyMap<K, V>,
  same: (a: V, b: V) => boolean = Object.is,
): [K, "added" | "modified" | "deleted"][] {
  const out: [K, "added" | "modified" | "deleted"][] = [];
  for (const [key, value] of after) {
    const old = before.get(key);
    if (old === undefined) out.push([key, "added"]);
    else if (!same(old, value)) out.push([key, "modified"]);
  }
  for (const key of before.keys()) {
    if (!after.has(key)) out.push([key, "deleted"]);
  }
  return out;
}

/** State changes between two worlds, as comparable keys (ADR-002 drift check). */
export function stateChanges(before: World, after: World): string[] {
  const out = new Set<string>();
  for (const oid of after.objects.keys()) {
    if (!before.objects.has(oid)) out.add(`object ${oid}`);
  }
  for (const [id, repo] of after.repos) {
    const old = before.repos.get(id);
    if (!old) {
      out.add(`repo ${id}`);
      continue;
    }
    for (const [ref] of mapDiff(old.refs, repo.refs)) {
      out.add(`ref ${id} ${ref} ${repo.refs.get(ref) ?? "(deleted)"}`);
    }
    if (headKey(old.head) !== headKey(repo.head)) {
      out.add(`head ${id} ${headKey(repo.head)}`);
    }
    const sameEntries = (a: readonly { oid: string }[], b: typeof a) =>
      a.length === b.length && a.every((e, i) => e.oid === b[i]?.oid);
    for (const [path, change] of mapDiff(old.index, repo.index, sameEntries)) {
      out.add(`index ${id} ${path} ${change}`);
    }
    configKeys(out, "local", id, old.config, repo.config);
  }
  for (const [id, machine] of after.machines) {
    const old = before.machines.get(id);
    if (!old) continue;
    for (const [path, change] of mapDiff(old.fs.files, machine.fs.files)) {
      out.add(`file ${id} ${path} ${change}`);
    }
    for (const dir of machine.fs.dirs) {
      if (!old.fs.dirs.has(dir)) out.add(`dir ${id} ${dir} added`);
    }
    for (const dir of old.fs.dirs) {
      if (!machine.fs.dirs.has(dir)) out.add(`dir ${id} ${dir} deleted`);
    }
    if (old.cwd !== machine.cwd) out.add(`cwd ${id} ${machine.cwd}`);
    configKeys(out, "global", id, old.config ?? [], machine.config ?? []);
  }
  return [...out].sort();
}

/** The same keys from emitted effects; effects without state are skipped. */
export function effectChanges(effects: readonly Effect[]): string[] {
  const out = new Set<string>();
  for (const e of effects) {
    switch (e.kind) {
      case "object-written":
        out.add(`object ${e.oid}`);
        break;
      case "repo-created":
        if (!e.reinitialized) out.add(`repo ${e.repo}`);
        break;
      case "ref-updated":
        out.add(`ref ${e.repo} ${e.ref} ${e.to ?? "(deleted)"}`);
        break;
      case "head-changed":
        out.add(`head ${e.repo} ${headKey(e.to)}`);
        break;
      case "index-changed":
        for (const c of e.changes)
          out.add(`index ${e.repo} ${c.path} ${c.change}`);
        break;
      case "files-changed":
        for (const c of e.changes)
          out.add(`${c.node} ${e.machine} ${c.path} ${c.change}`);
        break;
      case "cwd-changed":
        out.add(`cwd ${e.machine} ${e.to}`);
        break;
      case "config-changed":
        out.add(`config ${e.scope} ${e.target} ${e.key} ${e.to ?? "(unset)"}`);
        break;
      default:
        break;
    }
  }
  return [...out].sort();
}
