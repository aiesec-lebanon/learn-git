const CLOSING =
  /\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\b:?\s+#(\d+)\b/gi;

/** A closing reference such as "Fixes #7": where it sits in the text and the issue it names. */
export type ClosingMatch = {
  readonly start: number;
  readonly end: number;
  readonly number: number;
};

/** Every closing reference in a text, in order (any case, optional colon). */
export function closingMatches(text: string): ClosingMatch[] {
  return [...text.matchAll(CLOSING)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    number: Number(m[2]),
  }));
}

/** Issue numbers a text closes with a keyword such as "Fixes #7" (any case), in order. */
export function closingIssues(text: string): number[] {
  return [...new Set(closingMatches(text).map((m) => m.number))];
}
