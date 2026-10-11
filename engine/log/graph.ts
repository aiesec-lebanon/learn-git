import type { Oid } from "../types";
import type { WalkedCommit } from "./walk";

/**
 * Git's `--topo-order`: no commit before all its children, tips in date
 * order, and each parent line followed to its end before the next (the
 * last parent of a merge first).
 */
export function topoOrder(walked: readonly WalkedCommit[]): WalkedCommit[] {
  const byOid = new Map(walked.map((w) => [w.oid, w]));
  const children = new Map<Oid, number>();
  for (const { commit } of walked) {
    for (const parent of commit.parents) {
      if (byOid.has(parent)) {
        children.set(parent, (children.get(parent) ?? 0) + 1);
      }
    }
  }
  const stack = walked.filter((w) => !children.get(w.oid)).reverse();
  const out: WalkedCommit[] = [];
  for (let next = stack.pop(); next; next = stack.pop()) {
    out.push(next);
    for (const parent of next.commit.parents) {
      const left = (children.get(parent) ?? 0) - 1;
      children.set(parent, left);
      const item = byOid.get(parent);
      if (left === 0 && item) stack.push(item);
    }
  }
  return out;
}

type State = "padding" | "commit" | "post-merge" | "collapsing";

/**
 * The lanes Git draws left of `log --graph` output. Lanes hold the commit
 * each line leads to; a mapping per character column says which lane each
 * line heads for, and collapsing rows walk lines left one column at a time.
 */
class Lanes {
  private columns: Oid[] = [];
  private next: Oid[] = [];
  private mapping: number[] = [];
  private oldMapping: number[] = [];
  private width = 0;
  private commit: Oid | null = null;
  private parents: readonly Oid[] = [];
  private index = 0;
  private prevIndex = 0;
  private edgesAdded = 0;
  private prevEdgesAdded = 0;
  private layout = -1;
  state: State = "padding";
  private prevState: State = "padding";

  private at(list: readonly number[], i: number): number {
    return i < 0 ? -1 : (list[i] ?? -1);
  }

  private set(state: State) {
    this.prevState = this.state;
    this.state = state;
  }

  private pad(text: string): string {
    return text.padEnd(this.width);
  }

  private place(commit: Oid, from: number) {
    let lane = this.next.indexOf(commit);
    if (lane < 0) lane = this.next.push(commit) - 1;
    let column: number;
    if (this.parents.length > 1 && from > -1 && this.layout === -1) {
      const distance = from - lane;
      const shift = distance > 1 ? 2 * distance - 3 : 1;
      this.layout = distance > 0 ? 0 : 1;
      this.edgesAdded = this.parents.length + this.layout - 2;
      column = this.width + (this.layout - 1) * shift;
      this.width += 2 * this.layout;
    } else if (
      this.edgesAdded > 0 &&
      lane === this.at(this.mapping, this.width - 2)
    ) {
      column = this.width - 2;
      this.edgesAdded = -1;
    } else {
      column = this.width;
      this.width += 2;
    }
    this.mapping[column] = lane;
  }

  /** Starts the rows for `commit`, whose parents follow it in the output. */
  update(commit: Oid, parents: readonly Oid[]) {
    this.commit = commit;
    this.parents = parents;
    this.prevIndex = this.index;
    this.prevEdgesAdded = this.edgesAdded;
    this.oldMapping = this.mapping;
    this.columns = this.next;
    this.next = [];
    this.mapping = [];
    this.width = 0;
    this.edgesAdded = 0;
    let seen = false;
    for (let i = 0; i <= this.columns.length; i++) {
      if (i === this.columns.length && seen) break;
      const lane = this.columns[i] ?? commit;
      if (lane === commit) {
        seen = true;
        this.index = i;
        this.layout = -1;
        for (const parent of parents) this.place(parent, i);
        if (!parents.length) this.width += 2;
      } else this.place(lane, -1);
    }
    while (
      this.mapping.length > 1 &&
      this.at(this.mapping, this.mapping.length - 1) < 0
    ) {
      this.mapping.length -= 1;
    }
    this.state = "commit";
  }

  private correct(): boolean {
    return this.mapping.every(
      (t, i) => t === undefined || t < 0 || t === i >> 1,
    );
  }

  /** The lanes as they stand, each `|`: the blank line between long entries. */
  separator(): string {
    this.prevState = "padding";
    return this.pad(this.columns.map(() => "| ").join(""));
  }

  private commitRow(): string {
    let out = "";
    let seen = false;
    for (let i = 0; i <= this.columns.length; i++) {
      if (i === this.columns.length && seen) break;
      const lane = this.columns[i] ?? this.commit;
      if (lane === this.commit) {
        seen = true;
        out += "*";
      } else if (seen && this.edgesAdded > 1) out += "\\";
      else if (seen && this.edgesAdded === 1) {
        const skewed =
          this.prevState === "post-merge" &&
          this.prevEdgesAdded > 0 &&
          this.prevIndex < i;
        out += skewed ? "\\" : "|";
      } else if (
        this.prevState === "collapsing" &&
        this.at(this.oldMapping, 2 * i + 1) === i &&
        this.at(this.mapping, 2 * i) < i
      ) {
        out += "/";
      } else out += "|";
      out += " ";
    }
    if (this.parents.length > 1) this.set("post-merge");
    else this.set(this.correct() ? "padding" : "collapsing");
    return out;
  }

  private postMergeRow(): string {
    let out = "";
    let seen = false;
    let parentLane = false;
    for (let i = 0; i <= this.columns.length; i++) {
      if (i === this.columns.length && seen) break;
      const lane = this.columns[i] ?? this.commit;
      if (lane === this.commit) {
        seen = true;
        let style = this.layout;
        this.parents.forEach((_, j) => {
          out += "/|\\"[style];
          if (style !== 2) style += 1;
          else if (this.edgesAdded > 0 || j < this.parents.length - 1) {
            out += " ";
          }
        });
        if (this.edgesAdded === 0) out += " ";
      } else if (seen) {
        out += this.edgesAdded > 0 ? "\\ " : "| ";
      } else {
        out += "|";
        if (this.layout !== 0 || i !== this.index - 1) {
          out += parentLane ? "_" : " ";
        }
      }
      if (lane === this.parents[0]) parentLane = true;
    }
    this.set(this.correct() ? "padding" : "collapsing");
    return out;
  }

  private collapsingRow(): string {
    const size = this.mapping.length;
    const moved: number[] = [];
    let edge = -1;
    let edgeTarget = -1;
    const fill = (target: number, i: number) => {
      for (let j = target * 2 + 3; j < i - 2; j += 2) moved[j] = target;
    };
    for (let i = 0; i < size; i++) {
      const target = this.at(this.mapping, i);
      if (target < 0) continue;
      if (target * 2 === i) moved[i] = target;
      else if (this.at(moved, i - 1) < 0) {
        moved[i - 1] = target;
        if (edge === -1) {
          edge = i;
          edgeTarget = target;
          fill(target, i);
        }
      } else if (this.at(moved, i - 1) !== target) {
        moved[i - 2] = target;
        if (edge === -1) {
          edge = i;
          edgeTarget = target - 1;
          fill(target, i);
        }
      }
    }
    const length = this.at(moved, size - 1) < 0 ? size - 1 : size;
    let out = "";
    let horizontal = false;
    for (let i = 0; i < length; i++) {
      const target = this.at(moved, i);
      if (target < 0) out += " ";
      else if (target * 2 === i) out += "|";
      else if (target === edgeTarget && i !== edge - 1) {
        if (i !== target * 2 + 3) moved[i] = -1;
        horizontal = true;
        out += "_";
      } else {
        if (horizontal && i < edge) moved[i] = -1;
        out += "/";
      }
    }
    this.mapping = Array.from({ length }, (_, i) => this.at(moved, i));
    if (this.correct()) this.set("padding");
    return out;
  }

  /** The next row of graph, padded to the commit's width. */
  row(): string {
    switch (this.state) {
      case "commit":
        return this.pad(this.commitRow());
      case "post-merge":
        return this.pad(this.postMergeRow());
      case "collapsing":
        return this.pad(this.collapsingRow());
      case "padding":
        return this.pad(this.next.map(() => "| ").join(""));
    }
  }
}

export type GraphEntry = {
  readonly oid: Oid;
  readonly parents: readonly Oid[];
  /** The entry's text lines, without line ends. */
  readonly lines: readonly string[];
};

/**
 * `log --graph` output: each entry's lines behind the graph, the graph's
 * own rows where the text runs out, and (with `separated`) a blank line
 * between entries. `rows` holds the row of each commit line.
 */
export function drawGraph(
  entries: readonly GraphEntry[],
  separated: boolean,
): { text: string; rows: number[] } {
  const lanes = new Lanes();
  const out: string[] = [];
  const rows: number[] = [];
  entries.forEach((entry, k) => {
    lanes.update(entry.oid, entry.parents);
    if (separated && k > 0) out.push(lanes.separator());
    rows.push(out.length);
    for (const line of entry.lines) out.push(lanes.row() + line);
    while (lanes.state !== "padding") out.push(lanes.row());
  });
  return { text: out.map((line) => `${line}\n`).join(""), rows };
}
