const CLOSING =
  /\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\b:?\s+#(\d+)\b/gi;

/** Issue numbers a text closes with a keyword such as "Fixes #7" (any case), in order. */
export function closingIssues(text: string): number[] {
  const found = [...text.matchAll(CLOSING)].map((m) => Number(m[2]));
  return [...new Set(found)];
}
