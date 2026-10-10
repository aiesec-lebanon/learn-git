import {
  abbreviate,
  shortRefName,
  type Effect,
  type Oid,
  type World,
} from "@/engine";

/** Before → after chips that replace motion when it is reduced (ADR-004). */
export function annotate(
  effects: readonly Effect[],
  world: World,
  root: string,
): readonly string[] {
  const id = (oid: Oid | null) =>
    oid ? abbreviate(world.objects, oid) : "none";
  const prefix = root === "/" ? "/" : `${root}/`;
  const verbs = { added: "created", modified: "changed", deleted: "deleted" };
  const out: string[] = [];
  for (const e of effects) {
    switch (e.kind) {
      case "files-changed":
        for (const c of e.changes)
          if (c.node === "file" && c.path.startsWith(prefix))
            out.push(`${c.path.slice(prefix.length)}: ${verbs[c.change]}`);
        break;
      case "index-changed":
        for (const c of e.changes)
          out.push(
            c.change === "deleted"
              ? `${c.path}: out of the staging area`
              : e.from === "worktree"
                ? `${c.path}: copied into the staging area`
                : `${c.path} → staging area`,
          );
        break;
      case "object-written":
        if (e.type === "commit") out.push(`new commit ${id(e.oid)}`);
        break;
      case "ref-updated":
        out.push(`${shortRefName(e.ref)}: ${id(e.from)} → ${id(e.to)}`);
        break;
      case "head-changed":
        out.push(
          `HEAD → ${e.to.kind === "symbolic" ? shortRefName(e.to.ref) : id(e.to.oid)}`,
        );
        break;
      default:
        break;
    }
  }
  return out;
}

export function Annotations({ notes }: { notes: readonly string[] }) {
  if (!notes.length) return null;
  return (
    <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {notes.map((note, i) => (
        <li
          key={i}
          className="rounded-xs bg-hl px-2 py-0.5 font-display text-sm font-semibold text-fg"
        >
          <bdi>{note}</bdi>
        </li>
      ))}
    </ul>
  );
}
