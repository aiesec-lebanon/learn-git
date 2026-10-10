const ESCAPES: Readonly<Record<string, string>> = {
  "\x07": "\\a",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\v": "\\v",
  "\f": "\\f",
  "\r": "\\r",
  '"': '\\"',
  "\\": "\\\\",
};

const NEEDS_QUOTES = /[\x00-\x1f"\\\x7f-\u{10ffff}]/u;
const encoder = new TextEncoder();

/** Git's C-style path quoting (`core.quotePath` true): only paths that need it. */
export function quotePath(path: string): string {
  if (!NEEDS_QUOTES.test(path)) return path;
  let out = "";
  for (const char of path) {
    const code = char.codePointAt(0) ?? 0;
    if (ESCAPES[char]) out += ESCAPES[char];
    else if (code < 0x20 || code >= 0x7f) {
      for (const byte of encoder.encode(char)) {
        out += `\\${byte.toString(8).padStart(3, "0")}`;
      }
    } else out += char;
  }
  return `"${out}"`;
}
