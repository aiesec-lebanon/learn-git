import type { Oid } from "@/engine";
import type { Layout } from "./layout";
import type { RepoView } from "./view-model";

/**
 * Roving focus in the graph: Left to the first parent, Right to the first
 * child, Up and Down to the nearest commit in the neighbouring lane, Home
 * and End to the oldest and newest commit. Null when the key does nothing.
 */
export function nextFocus(
  key: string,
  current: Oid,
  view: RepoView,
  layout: Layout,
): Oid | null {
  const commits = view.commits;
  const here = layout.nodes.get(current);
  if (!here) return null;
  switch (key) {
    case "ArrowLeft":
      return commits.find((c) => c.oid === current)?.parents[0] ?? null;
    case "ArrowRight":
      return (
        commits.find((c) => c.parents[0] === current)?.oid ??
        commits.find((c) => c.parents.includes(current))?.oid ??
        null
      );
    case "ArrowUp":
    case "ArrowDown": {
      const lane = here.lane + (key === "ArrowUp" ? -1 : 1);
      let best: Oid | null = null;
      let distance = Infinity;
      for (const node of layout.nodes.values()) {
        const d = Math.abs(node.column - here.column);
        if (node.lane === lane && d < distance) {
          best = node.oid;
          distance = d;
        }
      }
      return best;
    }
    case "Home":
      return commits[0]?.oid ?? null;
    case "End":
      return commits.at(-1)?.oid ?? null;
    default:
      return null;
  }
}
