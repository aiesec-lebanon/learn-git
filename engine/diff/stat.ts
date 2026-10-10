import { quotePath } from "../files/quote";
import { isBinary, numstat } from "./numstat";
import type { FilePair } from "./unified";

const WIDTH = 80;
const encoder = new TextEncoder();

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** Git's summary line: ` 2 files changed, 3 insertions(+), 1 deletion(-)`. */
export function statTotals(
  files: number,
  added: number,
  deleted: number,
): string {
  const parts = [` ${plural(files, "file changed", "files changed")}`];
  if (added || !deleted)
    parts.push(plural(added, "insertion(+)", "insertions(+)"));
  if (deleted || !added)
    parts.push(plural(deleted, "deletion(-)", "deletions(-)"));
  return `${parts.join(", ")}\n`;
}

type Row = {
  name: string;
  added: number;
  deleted: number;
  bytes: [number, number] | null;
};

const digits = (n: number) => String(n).length;
const scale = (n: number, width: number, max: number) =>
  n ? 1 + Math.floor((n * (width - 1)) / max) : 0;
const size = (content: string | undefined) =>
  content === undefined ? 0 : encoder.encode(content).length;

/** `git diff --stat` at 80 columns: names shortened with `...`, bars scaled, then the totals. */
export function diffStat(pairs: readonly FilePair[]): string {
  if (pairs.length === 0) return "";
  const rows: Row[] = pairs.map(({ path, before, after }) => {
    const binary =
      isBinary(before?.content ?? "") || isBinary(after?.content ?? "");
    const stat = numstat(before?.content ?? null, after?.content ?? null);
    return {
      name: quotePath(path),
      added: stat.added,
      deleted: stat.deleted,
      bytes: binary ? [size(before?.content), size(after?.content)] : null,
    };
  });
  const text = rows.filter((r) => !r.bytes);
  const maxChange = Math.max(0, ...text.map((r) => r.added + r.deleted));
  const maxLen = Math.max(...rows.map((r) => r.name.length));
  const binWidth = Math.max(
    0,
    ...rows.map((r) =>
      r.bytes ? 14 + digits(r.bytes[1]) + digits(r.bytes[0]) : 0,
    ),
  );
  const numberWidth = Math.max(
    digits(maxChange),
    text.length < rows.length ? 3 : 0,
  );
  let graphWidth = maxChange + 4 > binWidth ? maxChange : binWidth - 4;
  let nameWidth = maxLen;
  if (nameWidth + numberWidth + 6 + graphWidth > WIDTH) {
    const third = Math.floor((WIDTH * 3) / 8) - numberWidth - 6;
    if (graphWidth > third) graphWidth = Math.max(third, 6);
    if (nameWidth > WIDTH - numberWidth - 6 - graphWidth) {
      nameWidth = WIDTH - numberWidth - 6 - graphWidth;
    } else graphWidth = WIDTH - numberWidth - 6 - nameWidth;
  }
  let out = "";
  for (const row of rows) {
    let name = row.name;
    let room = nameWidth;
    let prefix = "";
    if (name.length > nameWidth) {
      prefix = "...";
      room = Math.max(nameWidth - 3, 0);
      name = name.slice(name.length - room);
      const slash = name.indexOf("/");
      if (slash >= 0) name = name.slice(slash);
    }
    const label = ` ${prefix}${name.padEnd(room)} | `;
    if (row.bytes) {
      const [from, to] = row.bytes;
      out += `${label}${"Bin".padStart(numberWidth)}${from || to ? ` ${from} -> ${to} bytes` : ""}\n`;
      continue;
    }
    let add = row.added;
    let del = row.deleted;
    if (graphWidth <= maxChange) {
      let total = scale(add + del, graphWidth, maxChange);
      if (total < 2 && add && del) total = 2;
      if (add < del) {
        add = scale(add, graphWidth, maxChange);
        del = total - add;
      } else {
        del = scale(del, graphWidth, maxChange);
        add = total - del;
      }
    }
    const count = row.added + row.deleted;
    out += `${label}${String(count).padStart(numberWidth)}${count ? " " : ""}${"+".repeat(add)}${"-".repeat(del)}\n`;
  }
  const added = rows.reduce((n, r) => n + r.added, 0);
  const deleted = rows.reduce((n, r) => n + r.deleted, 0);
  return out + statTotals(rows.length, added, deleted);
}
