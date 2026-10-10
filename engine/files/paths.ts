/** Resolves `path` against the absolute directory `cwd`, folding `.` and `..`. */
export function resolvePath(cwd: string, path: string): string {
  const parts: string[] = [];
  const start = path.startsWith("/") ? path : `${cwd}/${path}`;
  for (const part of start.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

export function parentOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut <= 0 ? "/" : path.slice(0, cut);
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Every ancestor directory of an absolute path, from `/` down, excluding the path itself. */
export function ancestors(path: string): string[] {
  const out: string[] = [];
  for (let dir = parentOf(path); ; dir = parentOf(dir)) {
    out.unshift(dir);
    if (dir === "/") return out;
  }
}

/** `path` relative to `base` when it is `base` or inside it, else null. */
export function relativeTo(base: string, path: string): string | null {
  if (path === base) return "";
  const prefix = base === "/" ? "/" : `${base}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : null;
}

/** How a terminal path reads relative to `cwd` (Git's `../` style). */
export function displayRelative(cwd: string, path: string): string {
  const from = cwd === "/" ? [] : cwd.slice(1).split("/");
  const to = path === "/" ? [] : path.slice(1).split("/");
  let common = 0;
  while (
    common < from.length &&
    common < to.length &&
    from[common] === to[common]
  )
    common++;
  const ups = from.slice(common).map(() => "..");
  return [...ups, ...to.slice(common)].join("/");
}
