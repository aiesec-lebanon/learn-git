import { resolvePath } from "../files/paths";
import { listDir } from "../files/worktree";
import type { Fs, Word } from "../types";
import { compareBytes } from "../util/compare";

const SPECIAL = /[.*+?^${}()|[\]\\/]/g;

function segmentRegex(segment: string): RegExp {
  let out = "";
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i] ?? "";
    if (c === "\\") {
      out += (segment[++i] ?? "\\").replace(SPECIAL, "\\$&");
    } else if (c === "*") {
      out += "[^/]*";
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "[") {
      const close = segment.indexOf("]", i + 2);
      if (close < 0) {
        out += "\\[";
        continue;
      }
      let body = segment.slice(i + 1, close);
      const negate = body.startsWith("!") || body.startsWith("^");
      if (negate) body = body.slice(1);
      out += `[${negate ? "^" : ""}${body.replace(/[\\\]^]/g, "\\$&")}]`;
      i = close;
    } else {
      out += c.replace(SPECIAL, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

const hasGlob = (segment: string) => /(^|[^\\])[*?[]/.test(segment);
const unescape = (segment: string) => segment.replace(/\\(.)/g, "$1");

/** Pathname expansion over the virtual filesystem; no match keeps the word (bash). */
export function expandWord(fs: Fs, cwd: string, word: Word): string[] {
  if (word.pattern === undefined) return [word.text];
  const absolute = word.pattern.startsWith("/");
  const segments = word.pattern
    .split("/")
    .filter((s, i) => s !== "" || i === 0);
  let found: string[] = [absolute ? "/" : ""];
  for (const segment of segments.slice(absolute ? 1 : 0)) {
    const next: string[] = [];
    for (const prefix of found) {
      const dir = resolvePath(cwd, prefix || ".");
      const join = (name: string) =>
        prefix === ""
          ? name
          : prefix.endsWith("/")
            ? `${prefix}${name}`
            : `${prefix}/${name}`;
      if (!hasGlob(segment)) {
        next.push(join(unescape(segment)));
        continue;
      }
      const regex = segmentRegex(segment);
      const showHidden = segment.startsWith(".");
      for (const entry of listDir(fs, dir)) {
        if (entry.name.startsWith(".") && !showHidden) continue;
        if (regex.test(entry.name)) next.push(join(entry.name));
      }
    }
    found = next;
  }
  const exists = (p: string) => {
    const path = resolvePath(cwd, p);
    return fs.files.has(path) || fs.dirs.has(path);
  };
  const matches = found.filter(exists).sort(compareBytes);
  return matches.length > 0 ? matches : [word.text];
}
