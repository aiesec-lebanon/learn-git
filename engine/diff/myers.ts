/** Lines with their terminators, so a missing final newline is a difference. */
export function splitLines(content: string): string[] {
  const lines = content.split(/(?<=\n)/);
  return lines.at(-1) === "" ? lines.slice(0, -1) : lines;
}

/**
 * Which lines of `a` and `b` are kept: a minimal edit script by Myers'
 * O(ND) algorithm in linear space (split at a middle point, recurse).
 */
export function diffLines(
  a: readonly string[],
  b: readonly string[],
): { keptA: boolean[]; keptB: boolean[] } {
  const keptA = new Array<boolean>(a.length).fill(false);
  const keptB = new Array<boolean>(b.length).fill(false);

  const solve = (aLo: number, aHi: number, bLo: number, bHi: number) => {
    while (aLo < aHi && bLo < bHi && a[aLo] === b[bLo]) {
      keptA[aLo++] = true;
      keptB[bLo++] = true;
    }
    while (aLo < aHi && bLo < bHi && a[aHi - 1] === b[bHi - 1]) {
      keptA[--aHi] = true;
      keptB[--bHi] = true;
    }
    if (aLo === aHi || bLo === bHi) return;
    const [x, y] = middle(a, b, aLo, aHi, bLo, bHi);
    solve(aLo, x, bLo, y);
    solve(x, aHi, y, bHi);
  };
  solve(0, a.length, 0, b.length);
  return { keptA, keptB };
}

const get = (v: Int32Array, i: number) => v[i] ?? -1;

/**
 * A point where the forward and reverse searches overlap: it lies on an
 * optimal path and strictly inside the box, so both halves are smaller.
 */
function middle(
  a: readonly string[],
  b: readonly string[],
  aLo: number,
  aHi: number,
  bLo: number,
  bHi: number,
): [number, number] {
  const n = aHi - aLo;
  const m = bHi - bLo;
  const maxD = Math.ceil((n + m) / 2);
  const offset = maxD;
  const size = 2 * maxD;
  const v1 = new Int32Array(size + 2).fill(-1);
  const v2 = new Int32Array(size + 2).fill(-1);
  v1[offset + 1] = 0;
  v2[offset + 1] = 0;
  const delta = n - m;
  const front = delta % 2 !== 0;
  let k1start = 0;
  let k1end = 0;
  let k2start = 0;
  let k2end = 0;
  for (let d = 0; d < maxD; d++) {
    for (let k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      const k1o = offset + k1;
      let x1 =
        k1 === -d || (k1 !== d && get(v1, k1o - 1) < get(v1, k1o + 1))
          ? get(v1, k1o + 1)
          : get(v1, k1o - 1) + 1;
      let y1 = x1 - k1;
      while (x1 < n && y1 < m && a[aLo + x1] === b[bLo + y1]) {
        x1++;
        y1++;
      }
      v1[k1o] = x1;
      if (x1 > n) k1end += 2;
      else if (y1 > m) k1start += 2;
      else if (front) {
        const k2o = offset + delta - k1;
        if (k2o >= 0 && k2o < size && get(v2, k2o) !== -1) {
          if (x1 >= n - get(v2, k2o)) return [aLo + x1, bLo + y1];
        }
      }
    }
    for (let k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      const k2o = offset + k2;
      let x2 =
        k2 === -d || (k2 !== d && get(v2, k2o - 1) < get(v2, k2o + 1))
          ? get(v2, k2o + 1)
          : get(v2, k2o - 1) + 1;
      let y2 = x2 - k2;
      while (x2 < n && y2 < m && a[aHi - 1 - x2] === b[bHi - 1 - y2]) {
        x2++;
        y2++;
      }
      v2[k2o] = x2;
      if (x2 > n) k2end += 2;
      else if (y2 > m) k2start += 2;
      else if (!front) {
        const k1o = offset + delta - k2;
        if (k1o >= 0 && k1o < size && get(v1, k1o) !== -1) {
          const x1 = get(v1, k1o);
          if (x1 >= n - x2) return [aLo + x1, bLo + x1 - (k1o - offset)];
        }
      }
    }
  }
  return [aHi, bLo];
}
