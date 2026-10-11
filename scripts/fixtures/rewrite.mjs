const COMMAND_SCOPE_LINE =
  /^(?:command(?: line:)?\t)?(?:log\.decorate=short|url\..*\.insteadof=.*|core\.hookspath=.*)\n/gm;

/** The spellings Git for Windows and Git Bash use for one directory. */
export function pathForms(nativeDir) {
  const forward = nativeDir.replace(/\\/g, "/");
  const msys = forward.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
  return [nativeDir, forward, msys].sort((a, b) => b.length - a.length);
}

/**
 * Turns one recorded string into what the learner's machine would show:
 * the temp root disappears (so `<tmp>/home/you` reads `/home/you`), bare
 * repositories under `<tmp>/hub/` read as `https://hub.test/`, the host
 * name is neutral and bash's `line N:` (from `bash -c`) is dropped.
 */
export function createRewriter({
  tmpDir,
  hostname,
  username,
  aliases = /** @type {string[]} */ ([]),
}) {
  const forms = [...pathForms(tmpDir), ...aliases];
  return (text) => {
    let out = text;
    for (const form of forms) {
      for (const scheme of ["file:///", "file://"]) {
        out = out.split(`${scheme}${form}/hub/`).join("https://hub.test/");
      }
      out = out.split(form).join("");
    }
    if (hostname) out = out.split(hostname).join("laptop");
    if (username) out = out.split(`${username}@laptop`).join("you@laptop");
    return out
      .replace(/^(?:\/usr\/bin\/)?bash: line \d+: /gm, "bash: ")
      .replace(COMMAND_SCOPE_LINE, "");
  };
}

export function rewriteDeep(value, rewrite) {
  if (typeof value === "string") return rewrite(value);
  if (Array.isArray(value)) return value.map((v) => rewriteDeep(v, rewrite));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        rewrite(k),
        rewriteDeep(v, rewrite),
      ]),
    );
  }
  return value;
}

/** JSON with sorted object keys, two-space indent and a final LF. */
export function stableJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}
