type Token =
  | { readonly kind: "star" }
  | { readonly kind: "any" }
  | { readonly kind: "char"; readonly char: string }
  | {
      readonly kind: "class";
      readonly negate: boolean;
      readonly ranges: readonly (readonly [string, string])[];
    };

type Segment = readonly Token[] | "globstar";

const STAR: Token = { kind: "star" };

/**
 * Greedy wildcard matching with one backtrack point: O(pattern × subject)
 * steps, never exponential. `star` units match any run of subject units.
 */
function greedy<P, S>(
  pattern: readonly P[],
  subject: readonly S[],
  isStar: (p: P) => boolean,
  matchOne: (p: P, s: S) => boolean,
): boolean {
  let p = 0;
  let s = 0;
  let starAt = -1;
  let resumeAt = 0;
  while (s < subject.length) {
    const unit = pattern[p];
    if (unit !== undefined && isStar(unit)) {
      starAt = p++;
      resumeAt = s;
    } else if (unit !== undefined && matchOne(unit, subject[s] as S)) {
      p++;
      s++;
    } else if (starAt >= 0) {
      p = starAt + 1;
      s = ++resumeAt;
    } else return false;
  }
  while (p < pattern.length && isStar(pattern[p] as P)) p++;
  return p === pattern.length;
}

/** Tokens of one path segment, or null when a `[` never closes (Git then matches nothing). */
function tokenize(segment: string): Token[] | null {
  const out: Token[] = [];
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i] as string;
    if (c === "*") out.push(STAR);
    else if (c === "?") out.push({ kind: "any" });
    else if (c === "\\" && i + 1 < segment.length)
      out.push({ kind: "char", char: segment[++i] as string });
    else if (c === "[") {
      const parsed = bracket(segment, i + 1);
      if (!parsed) return null;
      out.push(parsed.token);
      i = parsed.end;
    } else out.push({ kind: "char", char: c });
  }
  return out;
}

function bracket(
  text: string,
  start: number,
): { token: Token; end: number } | null {
  let i = start;
  const negate = text[i] === "!" || text[i] === "^";
  if (negate) i++;
  const ranges: [string, string][] = [];
  for (let first = true; i < text.length; first = false) {
    let c = text[i] as string;
    if (c === "]" && !first)
      return { token: { kind: "class", negate, ranges }, end: i };
    if (c === "\\" && i + 1 < text.length) c = text[++i] as string;
    if (text[i + 1] === "-" && i + 2 < text.length && text[i + 2] !== "]") {
      let hi = text[i + 2] as string;
      i += 2;
      if (hi === "\\" && i + 1 < text.length) hi = text[++i] as string;
      ranges.push([c, hi]);
    } else ranges.push([c, c]);
    i++;
  }
  return null;
}

function matchToken(token: Token, char: string): boolean {
  switch (token.kind) {
    case "any":
      return true;
    case "char":
      return token.char === char;
    case "class":
      return (
        token.ranges.some(([lo, hi]) => lo <= char && char <= hi) !==
        token.negate
      );
    default:
      return false;
  }
}

const isStarToken = (t: Token) => t.kind === "star";

function matchSegment(tokens: readonly Token[], name: string): boolean {
  return greedy(tokens, [...name], isStarToken, matchToken);
}

/** Matches one name (no `/`) against a glob: `*`, `?`, `[...]` and `\` escapes. */
export function compileName(glob: string): (name: string) => boolean {
  const tokens = tokenize(glob);
  return tokens ? (name) => matchSegment(tokens, name) : () => false;
}

/**
 * Matches a slash-separated path the way Git's wildmatch does with
 * WM_PATHNAME: `*` stays inside a segment, a whole `**` segment spans any
 * number of segments, and a trailing `/**` needs at least one.
 */
export function compilePath(glob: string): (path: string) => boolean {
  const parts = glob.split("/");
  const segments: Segment[] = [];
  for (const part of parts) {
    if (part === "**") segments.push("globstar");
    else {
      const tokens = tokenize(part);
      if (!tokens) return () => false;
      segments.push(tokens);
    }
  }
  if (segments.length > 1 && segments.at(-1) === "globstar")
    segments.splice(-1, 0, [STAR]);
  return (path) =>
    greedy(
      segments,
      path.split("/"),
      (s) => s === "globstar",
      (s, name) => s !== "globstar" && matchSegment(s, name),
    );
}
