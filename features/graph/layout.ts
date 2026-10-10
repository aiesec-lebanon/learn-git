import type { Oid } from "@/engine";
import type { RepoView } from "./view-model";

export type LayoutOptions = {
  /** Distance between arrival columns, in px. */
  readonly column: number;
  /** Distance between lanes, in px. */
  readonly lane: number;
  /** The theme's average glyph width for label text, in px. */
  readonly glyph: number;
  readonly pad: number;
};

export type Point = { readonly x: number; readonly y: number };

export type NodeLayout = Point & {
  readonly oid: Oid;
  readonly column: number;
  readonly lane: number;
};

export type EdgeLayout = {
  /** `child:parent`, stable across renders. */
  readonly key: string;
  readonly child: Oid;
  readonly parent: Oid;
  readonly from: Point;
  readonly to: Point;
  /** A second or later parent. */
  readonly merge: boolean;
};

export type Layout = {
  readonly nodes: ReadonlyMap<Oid, NodeLayout>;
  readonly edges: readonly EdgeLayout[];
  readonly lanes: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Lanes fixed at arrival: a first-parent continuation keeps its parent's
 * lane while that lane still ends at the parent, otherwise the lowest free
 * lane; a merged chain frees its lane. Only earlier commits are read, so a
 * commit's lane never changes when later commits arrive.
 */
export function assignLanes(
  commits: RepoView["commits"],
): ReadonlyMap<Oid, number> {
  const tips: (Oid | null)[] = [];
  const lanes = new Map<Oid, number>();
  for (const { oid, parents } of commits) {
    const [first, ...others] = parents;
    const parentLane = first === undefined ? undefined : lanes.get(first);
    let lane =
      parentLane !== undefined && tips[parentLane] === first
        ? parentLane
        : tips.indexOf(null);
    if (lane < 0) lane = tips.length;
    tips[lane] = oid;
    lanes.set(oid, lane);
    for (const other of others) {
      const merged = lanes.get(other);
      if (merged !== undefined && merged !== lane && tips[merged] === other)
        tips[merged] = null;
    }
  }
  return lanes;
}

export function layoutGraph(view: RepoView, options: LayoutOptions): Layout {
  const { column, lane, glyph, pad } = options;
  const lanes = assignLanes(view.commits);
  const nodes = new Map<Oid, NodeLayout>();
  view.commits.forEach(({ oid }, i) => {
    const l = lanes.get(oid) ?? 0;
    nodes.set(oid, {
      oid,
      column: i,
      lane: l,
      x: pad + i * column,
      y: pad + l * lane,
    });
  });
  const edges: EdgeLayout[] = [];
  for (const { oid, parents } of view.commits) {
    const to = nodes.get(oid);
    parents.forEach((parent, i) => {
      const from = nodes.get(parent);
      if (from && to)
        edges.push({
          key: `${oid}:${parent}`,
          child: oid,
          parent,
          from,
          to,
          merge: i > 0,
        });
    });
  }
  const labelChars = new Map<Oid, number>();
  for (const label of view.labels) {
    labelChars.set(
      label.target,
      Math.max(labelChars.get(label.target) ?? 0, label.name.length),
    );
  }
  let right = 0;
  for (const node of nodes.values()) {
    right = Math.max(right, node.x + (labelChars.get(node.oid) ?? 0) * glyph);
  }
  const laneCount = Math.max(1, ...[...lanes.values()].map((l) => l + 1));
  return {
    nodes,
    edges,
    lanes: laneCount,
    width: right + pad,
    height: pad * 2 + (laneCount - 1) * lane,
  };
}
