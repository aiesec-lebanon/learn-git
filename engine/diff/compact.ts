/**
 * Slides each run of changed lines down while the line after it equals
 * its first line (same diff, Git's resting position for ambiguous runs).
 * `kept` is changed in place; the caller owns it.
 */
export function slideDown(lines: readonly string[], kept: boolean[]): void {
  let start = 0;
  while (start < lines.length) {
    if (kept[start]) {
      start++;
      continue;
    }
    let end = start;
    while (end < lines.length && !kept[end]) end++;
    while (end < lines.length && kept[end] && lines[start] === lines[end]) {
      kept[start] = true;
      kept[end] = false;
      start++;
      end++;
      while (end < lines.length && !kept[end]) end++;
    }
    start = end;
  }
}
