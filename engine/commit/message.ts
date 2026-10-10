/**
 * Git's `whitespace` cleanup (the default for `-m`): trailing whitespace
 * goes, runs of blank lines become one, leading and trailing blank lines
 * go, and the message ends with a newline. Empty means "abort".
 */
export function cleanupMessage(paragraphs: readonly string[]): string {
  const lines = paragraphs
    .join("\n\n")
    .split("\n")
    .map((l) => l.trimEnd());
  const kept: string[] = [];
  for (const line of lines) {
    if (line === "" && (kept.length === 0 || kept.at(-1) === "")) continue;
    kept.push(line);
  }
  while (kept.at(-1) === "") kept.pop();
  return kept.length ? `${kept.join("\n")}\n` : "";
}

/** The first paragraph on one line, as `[main abc1234] <subject>` shows it. */
export function subjectOf(message: string): string {
  const paragraph = message.split("\n\n")[0] ?? "";
  return paragraph.split("\n").join(" ").trimEnd();
}
