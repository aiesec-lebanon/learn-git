import type { SkinEdge } from "../../contract";

const f = (v: number) => +v.toFixed(1);

/** FNV-1a over the string: the same name always gets the same wobble. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = Math.abs(Math.floor(seed)) % 233280;
  return () => (a = (a * 9301 + 49297) % 233280) / 233280;
}

/** A circle drawn by hand: four drifting quarter arcs and a short overshoot. */
export function handRing(rx: number, ry: number, seed: number, over = 0.55) {
  const r = rng(seed);
  const a0 = -2.3 + r() * 0.8;
  const m = [1.03, 0.99, 1.02, 0.985, 0.955].map((v) => v + (r() - 0.5) * 0.03);
  const k = (i: number) => m[i] ?? 1;
  const P = (a: number, s: number) =>
    [Math.cos(a) * rx * s, Math.sin(a) * ry * s] as const;
  const T = (a: number, s: number, t: number) =>
    [-Math.sin(a) * rx * s * t, Math.cos(a) * ry * s * t] as const;
  const curve = (a1: number, k1: number, a2: number, k2: number, t: number) => {
    const s = P(a1, k1);
    const e = P(a2, k2);
    const t1 = T(a1, k1, t);
    const t2 = T(a2, k2, t);
    return `C${f(s[0] + t1[0])} ${f(s[1] + t1[1])} ${f(e[0] - t2[0])} ${f(e[1] - t2[1])} ${f(e[0])} ${f(e[1])}`;
  };
  const p0 = P(a0, k(0));
  let d = `M${f(p0[0])} ${f(p0[1])}`;
  for (let i = 0; i < 4; i++) {
    const a1 = a0 + (i * Math.PI) / 2;
    d += curve(a1, k(i), a1 + Math.PI / 2, k(i + 1), 0.5523);
  }
  const a4 = a0 + 2 * Math.PI;
  return (
    d + curve(a4, k(4), a4 + over, k(4) * 0.92, (4 / 3) * Math.tan(over / 4))
  );
}

/** A line drawn by hand across `width`: gentle wobbles and a lifted end. */
export function handLine(width: number, seed: number): string {
  const r = rng(seed);
  const y = () => f(2 + (r() - 0.5) * 2.4);
  const third = width / 3;
  return `M0 ${y()}C${f(third * 0.5)} ${y()} ${f(third)} ${y()} ${f(third * 1.5)} ${y()}S${f(width * 0.85)} ${y()} ${f(width)} ${f(0.6 + r())}`;
}

/** Each note keeps its own small tilt, -2.2 to 2.2 degrees. */
export const tilt = (name: string) => ((hashStr(name) % 9) - 4) * 0.55;

function arrowHead(x: number, y: number, ux: number, uy: number) {
  const L = 7.5;
  const c = Math.cos(0.5);
  const s = Math.sin(0.5);
  const bx = -ux;
  const by = -uy;
  return `M${f(x + (bx * c - by * s) * L)} ${f(y + (bx * s + by * c) * L)}L${f(x)} ${f(y)}L${f(x + (bx * c + by * s) * L)} ${f(y + (-bx * s + by * c) * L)}`;
}

/**
 * An arrow from the child back to its parent (the direction Git stores the
 * link): forks bend near the parent, second parents bend near the merge.
 */
export function edgePath(edge: SkinEdge, gap: number, column: number): string {
  const { x: cx, y: cy } = edge.to;
  const { x: px, y: py } = edge.from;
  const sx = cx - gap;
  const ex = px + gap;
  const wob = ((hashStr(edge.key) % 5) - 2) * 0.6;
  if (sx - ex < 4) {
    const L = Math.hypot(cx - px, cy - py) || 1;
    const ux = (px - cx) / L;
    const uy = (py - cy) / L;
    return `M${f(cx + ux * gap)} ${f(cy + uy * gap)}L${f(px - ux * gap)} ${f(py - uy * gap)}${arrowHead(px - ux * gap, py - uy * gap, ux, uy)}`;
  }
  let d: string;
  if (Math.abs(cy - py) < 0.75) {
    d = `M${f(sx)} ${f(cy)}Q${f((sx + ex) / 2)} ${f(cy + wob)} ${f(ex)} ${f(py)}`;
  } else {
    const turn = Math.max(18, Math.min(column * 0.9, sx - ex));
    if (edge.merge) {
      const bx = sx - turn;
      d =
        `M${f(sx)} ${f(cy)}C${f(sx - turn * 0.55)} ${f(cy)} ${f(bx + turn * 0.45)} ${f(py)} ${f(bx)} ${f(py)}` +
        (bx - ex > 0.5
          ? `Q${f((bx + ex) / 2)} ${f(py + wob)} ${f(ex)} ${f(py)}`
          : "");
    } else {
      const bx = ex + turn;
      d =
        `M${f(sx)} ${f(cy)}` +
        (sx - bx > 0.5
          ? `Q${f((sx + bx) / 2)} ${f(cy + wob)} ${f(bx)} ${f(cy)}`
          : "") +
        `C${f(bx - turn * 0.45)} ${f(cy)} ${f(ex + turn * 0.55)} ${f(py)} ${f(ex)} ${f(py)}`;
    }
  }
  return d + arrowHead(ex, py, -1, 0);
}
